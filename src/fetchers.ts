/** Gauge data: Hub'Eau (official API, last month) and HydroPortail (hydro.eaufrance.fr, full history). */
import { DAY, HOUR, MAUVES, MONTJEAN } from "./config.js";
import { loadSeries, mergeSeries, type Series } from "./store.js";

const HUBEAU = "https://hubeau.eaufrance.fr/api/v2/hydrometrie/observations_tr";
const HYDROPORTAIL = (entity: string, code: string) => `https://www.hydro.eaufrance.fr/${entity}/ajax/${code}/series`;
const HP_WINDOW_DAYS = 180;
const HP_QUOTA = 500_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const dmy = (t: number) => { const d = new Date(t); return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`; };

export type Kind = "H" | "Q";
type Log = (msg: string) => void;

/** Last `days` days from Hub'Eau. Heights come in mm, flows in l/s: both divided by 1000. */
export async function fetchHubeau(code: string, kind: Kind, days = 31): Promise<Series> {
  const start = new Date(Date.now() - days * DAY).toISOString().replace(/\.\d+Z$/, "Z");
  for (const entity of [code, code.slice(0, 8)]) {
    let url: string | null = `${HUBEAU}?` + new URLSearchParams({ code_entite: entity, grandeur_hydro: kind,
      date_debut_obs: start, size: "20000", sort: "asc", fields: "date_obs,resultat_obs" });
    const out: Series = { t: [], v: [] };
    while (url) {
      const r = await fetch(url);
      if (r.status !== 200 && r.status !== 206) break;
      const js = await r.json() as { data?: { date_obs: string; resultat_obs: number }[]; next?: string | null };
      for (const d of js.data ?? []) { out.t.push(Date.parse(d.date_obs)); out.v.push(d.resultat_obs / 1000); }
      url = js.next ?? null;
    }
    if (out.t.length) return out;
  }
  return { t: [], v: [] };
}

function toMetric(v: number[], unit: string | undefined, kind: Kind): number[] {
  const u = (unit ?? "").toLowerCase();
  const med = [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)] ?? 0;
  if (kind === "Q") return u === "l" || u === "l/s" || med > 20000 ? v.map((x) => x / 1000) : v;
  if (u === "mm" || (u !== "m" && u !== "cm" && med > 50)) return v.map((x) => x / 1000);
  if (u === "cm") return v.map((x) => x / 100);
  return v;
}

class TooWide extends Error {}

async function hpRequest(code: string, kind: Kind, start: number, end: number, status: string): Promise<Series> {
  const days = Math.round((end - start) / DAY) + 1;
  const params = new URLSearchParams({
    "hydro_series[variableType]": "simple_and_interpolated_and_hourly_variable",
    "hydro_series[simpleAndInterpolatedAndHourlyVariable]": kind,
    "hydro_series[statusData]": status,
    "hydro_series[step]": String(Math.max(1, Math.ceil(days * 1440 / HP_QUOTA))),
    "hydro_series[startAt]": dmy(start),
    "hydro_series[endAt]": dmy(end),
  });
  const headers = { "User-Agent": "mauves-wave/1.0 (personal wave forecast)", Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest" };
  let lastStatus = 0;
  for (const [entity, c] of [["stationhydro", code], ["sitehydro", code.slice(0, 8)]]) {
    let r: Response | null = null, delay = 2000, elapsed = 0;
    for (let a = 0; a < 4; a++) {
      const t0 = Date.now();
      r = await fetch(`${HYDROPORTAIL(entity, c)}?${params}`, { headers });
      elapsed = Date.now() - t0;
      if ([429, 503, 504].includes(r.status)) { await sleep(delay); delay *= 2; continue; }
      break;
    }
    lastStatus = r!.status;
    if (r!.status === 404) continue;
    if (r!.status === 500) throw new TooWide();
    if (!r!.ok) throw new Error(`HydroPortail answered ${r!.status}`);
    const js = await r!.json() as { series?: { unit?: string; data?: { t: string; v: number | null }[] } };
    await sleep(Math.max(500, elapsed));   // pace ourselves on the server's own speed
    const pts = (js.series?.data ?? []).filter((p) => p.v !== null);
    return { t: pts.map((p) => Date.parse(p.t)), v: toMetric(pts.map((p) => p.v as number), js.series?.unit, kind) };
  }
  throw new Error(`HydroPortail answered ${lastStatus} for ${code}`);
}

/** Long series from HydroPortail, in windows; halves the window when the server refuses it. */
export async function fetchHydroportail(code: string, kind: Kind, start: number, end: number,
  log: Log = () => {}, status = "raw"): Promise<Series> {
  const out: Series = { t: [], v: [] };
  let cur = start, span = HP_WINDOW_DAYS;
  while (cur <= end) {
    const stop = Math.min(end, cur + (span - 1) * DAY);
    try {
      const part = await hpRequest(code, kind, cur, stop, status);
      out.t.push(...part.t); out.v.push(...part.v);
      log(`${kind === "H" ? "Mauves level" : "Montjean flow"} ${dmy(cur)} to ${dmy(stop)}: ${part.t.length} values`);
      cur = stop + DAY;
    } catch (e) {
      if (e instanceof TooWide && span > 2) { span = Math.floor(span / 2); continue; }
      throw e;
    }
  }
  return out;
}

export const STATIONS = [
  { name: "mauves_H", code: MAUVES, kind: "H" as Kind, label: "Mauves level" },
  { name: "montjean_Q", code: MONTJEAN, kind: "Q" as Kind, label: "Montjean flow" },
];

/** Latest data from Hub'Eau, falling back to HydroPortail, filling any hole in between. */
export async function updateStation(st: typeof STATIONS[number], log: Log): Promise<void> {
  const old = loadSeries(st.name);
  let add: Series = { t: [], v: [] };
  try { add = await fetchHubeau(st.code, st.kind); } catch (e) { log(`Hub'Eau failed (${(e as Error).message}); using HydroPortail`); }
  if (!add.t.length) add = await fetchHydroportail(st.code, st.kind, Date.now() - 31 * DAY, Date.now(), log);
  const lastOld = old.t[old.t.length - 1];
  if (old.t.length && add.t.length && add.t[0] - lastOld > 2 * HOUR) {
    log(`${st.label}: filling a gap from HydroPortail`);
    const gap = await fetchHydroportail(st.code, st.kind, lastOld, add.t[0], log);
    add = { t: [...gap.t, ...add.t], v: [...gap.v, ...add.v] };
  }
  const merged = add.t.length ? mergeSeries(st.name, add) : old;
  log(`${st.label}: ${add.t.length} new values, ${merged.t.length} stored`);
}

export async function downloadHistory(years: number, log: Log): Promise<void> {
  const start = Date.now() - Math.round(years * 365.25) * DAY;
  for (const st of STATIONS) {
    const s = await fetchHydroportail(st.code, st.kind, start, Date.now(), log);
    const merged = mergeSeries(st.name, s);
    log(`${st.label}: ${s.t.length} values downloaded, ${merged.t.length} stored`);
  }
}
