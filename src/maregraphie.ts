/** Saint-Nazaire and Brest tide gauge records from SHOM (REFMAR, data.shom.fr), downloaded BY HAND by the
 *  user into MAREGRAPHIE_DIR as <station>_<year>.json. This app never downloads them itself.
 *  Times are UTC, heights in m above chart datum (the same datum as the tide tables). */
import fs from "node:fs";
import path from "node:path";
import { BREST_SHOM_ID, MAREGRAPHIE_DIR, SN_SHOM_ID } from "./config.js";
import { loadImported, mergeSeries, saveImported, type Series } from "./store.js";

type Log = (msg: string) => void;

/** Preferred data source in the files: 3 (validated, 10 min), then 2 (10 min), then 1 (1 min,
 *  kept only on the 10-minute marks). Source 4 is hourly and not used. */
const PRIORITY: Record<number, number> = { 3: 3, 2: 2, 1: 1 };
const STEP = 600_000;

function readFile(file: string): Series {
  const js = JSON.parse(fs.readFileSync(file, "utf8")) as { data?: { idsource: number; value: number; timestamp: string }[] };
  const best = new Map<number, { p: number; v: number }>();
  for (const d of js.data ?? []) {
    const p = PRIORITY[d.idsource];
    if (!p || !Number.isFinite(d.value)) continue;
    const t = Date.parse(d.timestamp.replace(/\//g, "-").replace(" ", "T") + "Z");
    if (!Number.isFinite(t) || t % STEP !== 0) continue;
    const cur = best.get(t);
    if (!cur || cur.p < p) best.set(t, { p, v: d.value });
  }
  const t = [...best.keys()].sort((a, b) => a - b);
  return { t, v: t.map((x) => best.get(x)!.v) };
}

const STATIONS = [
  { id: SN_SHOM_ID, series: "stnazaire_H", label: "Saint-Nazaire" },
  { id: BREST_SHOM_ID, series: "brest_H", label: "Brest" },
];

/** Reads new or changed files into the "stnazaire_H" and "brest_H" series. Lists the series that changed. */
export function importGaugeFiles(log: Log): string[] {
  let names: string[];
  try { names = fs.readdirSync(MAREGRAPHIE_DIR); } catch { return []; }
  const done = { ...loadImported() };
  const changed: string[] = [];
  for (const station of STATIONS) {
    const re = new RegExp(`^${station.id}_\\d{4}\\.json$`);
    for (const name of names.filter((n) => re.test(n)).sort()) {
      const st = fs.statSync(path.join(MAREGRAPHIE_DIR, name)), stamp = `${st.size}:${st.mtimeMs}`;
      if (done[name] === stamp) continue;
      const s = readFile(path.join(MAREGRAPHIE_DIR, name));
      if (s.t.length) mergeSeries(station.series, s);
      log(`${station.label} gauge: ${name}, ${s.t.length.toLocaleString("en")} readings read`);
      done[name] = stamp;
      if (!changed.includes(station.series)) changed.push(station.series);
    }
  }
  if (changed.length) saveImported(done);
  return changed;
}
