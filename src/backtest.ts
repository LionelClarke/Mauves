/** Backtest of the week simulation: every Monday in the gauge record is simulated for 7 days from
 *  what was known at its start (with the fit that left its 4-week block out) and compared with the
 *  gauge. Read-only on the data. Run: npm run backtest (DATA_DIR as for the server). */
import { DateTime } from "luxon";
import { pathToFileURL } from "node:url";
import { DAY, HOUR, MIN, TZ } from "./config.js";
import { highs, levelErrors, lows, simulate, SIM_DEFAULTS, type SimOptions, type Simulation, type Turn } from "./level.js";
import { getData } from "./model.js";
import type { Grid } from "./series.js";
import { dataVersion } from "./store.js";

export const FLOW_CLASSES: [string, number][] = [["< 300", 300], ["300–800", 800], ["800–2000", 2000], ["> 2000", Infinity]];

export class Acc {
  n = 0; ss = 0; s = 0;
  add(x: number) { this.n++; this.ss += x * x; this.s += x; }
  get rms() { return this.n ? Math.sqrt(this.ss / this.n) : NaN; }
  get mean() { return this.n ? this.s / this.n : NaN; }
}

export interface Score {
  weeks: number; level: Acc; byDay: Acc[]; byFlow: Acc[];
  lowH: Acc; lowT: Acc; highH: Acc; highT: Acc; start: Acc; end: Acc; hit: number; total: number;
}

function score(sims: Simulation[], pick: (s: Simulation) => Grid): Score {
  const d = getData();
  const r: Score = { weeks: sims.length, level: new Acc(), byDay: Array.from({ length: 7 }, () => new Acc()),
    byFlow: FLOW_CLASSES.map(() => new Acc()), lowH: new Acc(), lowT: new Acc(), highH: new Acc(), highT: new Acc(),
    start: new Acc(), end: new Acc(), hit: 0, total: 0 };
  for (const s of sims) {
    const g = pick(s);
    for (const { t, err } of levelErrors(s, g)) {
      r.level.add(err);
      r.byDay[Math.min(6, Math.floor((t - s.t0) / DAY))].add(err);
      const q = d.Q24.at(t - s.opts.qlagH * HOUR);
      if (Number.isFinite(q)) r.byFlow[FLOW_CLASSES.findIndex(([, hi]) => q < hi)].add(err);
    }
    const turns = (xs: Turn[], h: Acc, tt: Acc) => { for (const x of xs) if (x.obs && x.sim) { h.add(x.sim.hmin - x.obs.hmin); tt.add((x.sim.tmin - x.obs.tmin) / MIN); } };
    const ls = lows(s, g);
    turns(ls, r.lowH, r.lowT);
    turns(highs(s, g), r.highH, r.highT);
    for (const x of ls) {
      if (!x.obs) continue;                  // score wave calls on the real lows
      r.total++; r.hit += Number(!!x.obsWindow === !!x.simWindow);
      if (x.obsWindow && x.simWindow) { r.start.add((x.simWindow[0] - x.obsWindow[0]) / MIN); r.end.add((x.simWindow[1] - x.obsWindow[1]) / MIN); }
    }
  }
  return r;
}

const cm = (a: Acc) => a.n ? `${(a.rms * 100).toFixed(1)}` : "–";
const mins = (a: Acc) => a.n ? `${a.rms.toFixed(0)}` : "–";

function line(name: string, r: Score) {
  return [name.padEnd(28), cm(r.level).padStart(6), (r.level.mean * 100).toFixed(1).padStart(6),
    r.byDay.map(cm).join(" ").padStart(36), r.byFlow.map(cm).join(" ").padStart(24),
    `${cm(r.lowH)}/${mins(r.lowT)}`.padStart(10), `${cm(r.highH)}/${mins(r.highT)}`.padStart(10),
    `${mins(r.start)}/${mins(r.end)} (${r.start.n})`.padStart(14), `${r.hit}/${r.total}`.padStart(10)].join(" ");
}

export function mondays(): number[] {
  const H = getData().H, out: number[] = [];
  let t = DateTime.fromMillis(H.t0 + 2 * DAY, { zone: TZ }).startOf("week").plus({ weeks: 1 });
  while (t.toMillis() + 7 * DAY <= H.tEnd) { out.push(t.toMillis()); t = t.plus({ weeks: 1 }); }
  return out;
}

export function backtest(o: SimOptions) {
  const sims = mondays().map((t0) => simulate(t0, 7, o));
  return { known: score(sims, (s) => s.sim), real: score(sims, (s) => s.simRealFlow) };
}

/** The backtest with the default options, for the page (about a second; kept until the data changes). */
let cached: { version: number; r: ReturnType<typeof backtest> } | null = null;
export function backtestSummary() {
  getData();
  if (!cached || cached.version !== dataVersion()) cached = { version: dataVersion(), r: backtest(SIM_DEFAULTS) };
  return cached.r;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  /** Variants tried, each against the defaults. */
  const VARIANTS: [string, Partial<SimOptions>][] = JSON.parse(process.env.VARIANTS ?? "null") ?? [["defaults", {}]];

  const t = Date.now();
  console.log(`${mondays().length} weeks. Level RMSE (cm) and mean error; RMSE by day 1–7; by flow ${FLOW_CLASSES.map((c) => c[0]).join(", ")};`);
  console.log("low and high: height cm / time min; wave start/end min (n); wave calls right.\n");
  for (const [name, v] of VARIANTS) {
    const o = { ...SIM_DEFAULTS, ...v }, r = backtest(o);
    console.log(line(`${name}`, r.known));
    console.log(line(`  with real flow`, r.real));
  }
  console.log(`\n${((Date.now() - t) / 1000).toFixed(1)} s`);
}
