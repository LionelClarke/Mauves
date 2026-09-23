import express from "express";
import { almanac, coefficientAt, daysOutside, tideFits } from "./almanac.js";
import { backtestSummary } from "./backtest.js";
import { weekView } from "./level.js";
import { DATA_DIR, LOWER, OFFLINE, PORT, TZ, UPPER } from "./config.js";
import { historyJob, jobState, log, refitIfStale, refitJob, runJob, startScheduler, updateJob } from "./jobs.js";
import { checkSessions, forecast, getData, type Model } from "./model.js";
import { loadModel, loadSeries, loadSessions, saveSessions } from "./store.js";
import { local, localMs, parseYmd } from "./time.js";
import { calendarPage, dataPage, emptyPage, forecastPage, sessionsPage, simulatePage } from "./views.js";

const app = express();
app.use(express.urlencoded({ extended: false, limit: "5mb" }));
app.use(express.json({ limit: "5mb" }));

type Banner = { text: string; error?: boolean };
const flash = new Map<string, Banner>();
const bannerFrom = (req: express.Request): Banner | undefined => {
  const k = String(req.query.m ?? ""); const b = flash.get(k); flash.delete(k); return b;
};
const redirectWith = (res: express.Response, to: string, b: Banner) => {
  const k = Math.random().toString(36).slice(2); flash.set(k, b); res.redirect(303, `${to}?m=${k}`);
};
const busy = (): Banner | undefined => jobState.running ? { text: `Working: ${jobState.running}…` } : undefined;

app.get("/", (req, res) => {
  const flow = req.query.flow ? Number(req.query.flow) : undefined;
  const banner = bannerFrom(req) ?? busy();
  try {
    const f = forecast(7, flow && Number.isFinite(flow) && flow > 0 ? flow : undefined);
    res.send(forecastPage(f, weekAhead(), banner));
  } catch (e) {
    res.send(emptyPage((e as Error).message, banner));
  }
});

/** The week from local midnight today, simulated with the fit on the whole record (null if it fails). */
function weekAhead() {
  const d = local(Date.now()).startOf("day"), brest = tideFits().brest;
  try { return weekView(localMs(d.year, d.month, d.day), brest ? (t) => coefficientAt(brest, t) : null, null); }
  catch (e) { log(`Week simulation: ${(e as Error).message}`); return null; }
}

app.get("/api/forecast", (req, res) => {
  try {
    const flow = req.query.flow ? Number(req.query.flow) : undefined;
    const f = forecast(Number(req.query.days ?? 7), flow);
    res.json({ band: { upper: UPPER, lower: LOWER }, now: f.now, qNow: f.qNow, qUsed: f.qUsed, rows: f.rows });
  } catch (e) { res.status(503).json({ error: (e as Error).message }); }
});

/** ?month=YYYY-MM, or ?mon=M&year=YYYY from the picker; the current month otherwise. */
app.get("/calendar", (req, res) => {
  const now = local(Date.now());
  let year = now.year, month = now.month;
  const mm = /^(\d{4})-(\d{2})$/.exec(String(req.query.month ?? ""));
  if (mm) { year = Number(mm[1]); month = Number(mm[2]); }
  else if (req.query.mon && req.query.year) { year = Number(req.query.year); month = Number(req.query.mon); }
  if (!(Number.isInteger(year) && year >= 2000 && year <= 2100 && Number.isInteger(month) && month >= 1 && month <= 12)) {
    year = now.year; month = now.month;
  }
  const al = almanac(year, month);
  const a = localMs(year, month, 1), b = a + 31 * 86_400_000;
  res.send(calendarPage(year, month, al, al ? daysOutside(al.stNazaire, a, b) : 0));
});

/** ?start=YYYY-MM-DD: the week from that day, simulated from what was known then (default: a week ago). */
function simulation(startQ: unknown) {
  const H = getData().H, today = local(Date.now()).startOf("day");
  const min = H.n ? local(H.t0).startOf("day").plus({ days: 2 }).toFormat("yyyy-LL-dd") : today.toFormat("yyyy-LL-dd");
  const max = today.toFormat("yyyy-LL-dd");
  let start = /^\d{4}-\d{2}-\d{2}$/.test(String(startQ ?? "")) ? String(startQ) : today.minus({ days: 7 }).toFormat("yyyy-LL-dd");
  if (start < min) start = min;
  if (start > max) start = max;
  const d = parseYmd(start), brest = tideFits().brest;
  return { start, bounds: { min, max }, view: () => weekView(localMs(d.year, d.month, d.day), brest ? (t) => coefficientAt(brest, t) : null) };
}

app.get("/simulate", (req, res) => {
  const s = simulation(req.query.start);
  try { res.send(simulatePage(s.view(), s.start, s.bounds, backtestSummary())); }
  catch (e) { res.send(simulatePage(null, s.start, s.bounds, null, (e as Error).message)); }
});

app.get("/api/simulate", (req, res) => {
  const s = simulation(req.query.start);
  try {
    const v = s.view();
    res.json({ start: s.start, q0: v.q0, bias: v.bias, errors: v.errors, lows: v.lows,
      points: v.points.map((p) => ({ ...p, real: Number.isFinite(p.real) ? p.real : null, qReal: Number.isFinite(p.qReal) ? p.qReal : null })) });
  } catch (e) { res.status(503).json({ error: (e as Error).message }); }
});

app.get("/sessions", (req, res) => res.send(sessionsPage(checkSessions(), bannerFrom(req))));

app.post("/sessions", (req, res) => {
  const { date, start, end, note } = req.body as Record<string, string>;
  const d = parseYmd(date);
  const [sh, sm] = start.split(":").map(Number);
  const s = localMs(d.year, d.month, d.day, sh, sm);
  let e: number | null = null;
  if (end) { const [eh, em] = end.split(":").map(Number); e = localMs(d.year, d.month, d.day, eh, em); }
  if (e !== null && !(e > s)) return redirectWith(res, "/sessions", { text: "The end time must be after the start time.", error: true });
  const all = loadSessions().filter((x) => !(x.start === s && x.end === e));
  saveSessions([...all, { start: s, end: e, note: (note ?? "").slice(0, 200) }]);
  redirectWith(res, "/sessions", { text: "Session recorded." });
});

app.post("/sessions/delete", (req, res) => {
  const i = Number(req.body.index);
  const all = loadSessions();
  if (i >= 0 && i < all.length) { all.splice(i, 1); saveSessions(all); }
  redirectWith(res, "/sessions", { text: "Session deleted." });
});

app.get("/data", (req, res) => {
  const series = [["mauves_H", "Mauves level"], ["montjean_Q", "Montjean flow"], ["stnazaire_H", "Saint-Nazaire tide gauge"], ["brest_H", "Brest tide gauge"]].map(([n, label]) => {
    const s = loadSeries(n); return { label, n: s.t.length, from: s.t[0] ?? null, to: s.t[s.t.length - 1] ?? null };
  });
  res.send(dataPage({ series, model: loadModel<Model>(), running: jobState.running, lastError: jobState.lastError,
    log: jobState.log, offline: OFFLINE }, bannerFrom(req)));
});

const start = (res: express.Response, job: () => Promise<boolean>, what: string) => {
  if (jobState.running) return redirectWith(res, "/data", { text: `Already working: ${jobState.running}.` });
  job();
  redirectWith(res, "/data", { text: `${what} started.` });
};
app.post("/actions/update", (_req, res) => OFFLINE ? redirectWith(res, "/data", { text: "Downloads are off (OFFLINE=1).", error: true }) : start(res, updateJob, "Update"));
app.post("/actions/refit", (_req, res) => start(res, refitJob, "Model fit"));
app.post("/actions/history", (req, res) => {
  const years = Math.min(20, Math.max(0.5, Number(req.body.years) || 2));
  OFFLINE ? redirectWith(res, "/data", { text: "Downloads are off (OFFLINE=1).", error: true }) : start(res, () => historyJob(years), `History download (${years} years)`);
});

app.get("/healthz", (_req, res) => res.json({ ok: true, running: jobState.running }));

app.listen(PORT, () => {
  log(`Mauves wave on http://localhost:${PORT} (data in ${DATA_DIR}, times in ${TZ})`);
  startScheduler();
});
