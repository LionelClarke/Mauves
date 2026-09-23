/** Continuous level at Mauves, simulated from the Saint-Nazaire tide and the Loire flow.
 *  Every tide cycle gets a curve (−1 h to +14 h after Saint-Nazaire high water) fitted like the
 *  falling curve in model.ts, but on all cycles, floods included; consecutive curves overlap and are
 *  crossfaded into one series. A week is simulated from what was known at its start: the flow up to
 *  then (and its trend), and the Mauves level just before it. */
import { CURVE_FROM_H, CURVE_STEP_MIN, DAY, FLOW_BW, HOUR, MIN } from "./config.js";
import type { Ebb } from "./harmonic.js";
import { currentModel, curveAt, curveSteps, detectLows, ebbsBetween, fitCurve, getData, observedWindow, xTide,
  type CurveFit, type CurveRow, type Low } from "./model.js";
import { Grid } from "./series.js";
import { dataVersion } from "./store.js";

export const STEP = 10 * MIN;

export interface SimOptions {
  /** Montjean to Mauves travel time (h). */
  qlagH: number;
  /** Width of the local weighting in ln(flow). */
  bw: number;
  /** Use the height of the next high water (it drives the rising end of each curve). */
  nextHw: boolean;
  /** Use the previous low water and high water (the water left from the last tide). */
  prevTide: boolean;
  /** Level correction from the day before the start: fade time (h, 0 = off) and cap (m). */
  tauH: number; biasCap: number;
  /** Extend a falling flow at its recent rate (per day, no faster than this; 0 = hold the last flow),
   *  the fall slowing with this e-folding time (days). */
  recessionMax: number; recessionDays: number;
  /** Same for a rising flow (0 = hold), with its own e-folding time (days); only rises faster
   *  than riseMin per day are extended. */
  riseMax: number; riseDays: number; riseMin: number;
}
export const SIM_DEFAULTS: SimOptions = { qlagH: 6, bw: FLOW_BW, nextHw: true, prevTide: false, tauH: 96, biasCap: 0.5,
  recessionMax: 1, recessionDays: 3, riseMax: 1, riseDays: 1, riseMin: 0.05 };

// ---------------------------------------------------------------- folds
/** Honest checks: 4-week blocks, each simulated from a fit that left its block out. */
export const FOLDS = 6;
const MONDAY0 = Date.UTC(1970, 0, 5);
export const foldOf = (t: number) => Math.floor(Math.floor((t - MONDAY0 + 12 * HOUR) / (7 * DAY)) / 4) % FOLDS;

// ---------------------------------------------------------------- fits
type Row = CurveRow & { thw: number };
let ctx: { version: number; ebbs: Ebb[]; rows: Map<string, Row[]>; fits: Map<string, CurveFit> } | null = null;

function context() {
  const m = currentModel(), d = getData();
  if (ctx && ctx.version === dataVersion()) return ctx;
  const ebbs = ebbsBetween(m, d.H.t0 - 2 * DAY, Math.max(d.H.tEnd, Date.now()) + 10 * DAY);
  ctx = { version: dataVersion(), ebbs, rows: new Map(), fits: new Map() };
  return ctx;
}

function features(o: SimOptions, q: number, ebbs: Ebb[], k: number): number[] {
  const x = xTide(q, ebbs[k]);
  if (o.nextHw) x.push((ebbs[k + 1]?.hw ?? ebbs[k].hw) - 5.5);
  if (o.prevTide) x.push((ebbs[k - 1]?.lw ?? ebbs[k].lw) - 1, (ebbs[k - 1]?.hw ?? ebbs[k].hw) - 5.5);
  return x;
}
/** The time whose flow drives a cycle: mid-curve, less the travel time. */
const flowTime = (o: SimOptions, e: Ebb) => e.thw + 6 * HOUR - o.qlagH * HOUR;

function trainingRows(o: SimOptions): Row[] {
  const c = context(), key = `${o.qlagH}|${o.nextHw}|${o.prevTide}`;
  let rows = c.rows.get(key);
  if (rows) return rows;
  const d = getData();
  rows = [];
  for (let k = 0; k < c.ebbs.length; k++) {
    const e = c.ebbs[k], q = d.Q24.at(flowTime(o, e));
    if (!(q > 0)) continue;
    const y = curveSteps.map((s) => d.H.at(e.thw + s));
    if (y.every(Number.isFinite)) rows.push({ thw: e.thw, q, x: features(o, q, c.ebbs, k), y });
  }
  c.rows.set(key, rows);
  return rows;
}

/** Fit on every cycle, or on all but one fold. */
export function levelFit(o: SimOptions, fold: number | null): CurveFit {
  const c = context(), key = `${o.qlagH}|${o.nextHw}|${o.prevTide}|${o.bw}|${fold}`;
  let f = c.fits.get(key);
  if (!f) {
    const rows = trainingRows(o).filter((r) => fold === null || foldOf(r.thw) !== fold);
    if (rows.length < 100) throw new Error("Not enough gauge data to fit the level model yet.");
    f = fitCurve(rows, o.bw);
    c.fits.set(key, f);
  }
  return f;
}

// ---------------------------------------------------------------- simulation
/** Level every STEP from a to b (both multiples of STEP): each cycle's curve, crossfaded over the
 *  hours where consecutive curves overlap. `qOf` gives the flow for a cycle from its flow time. */
function stitch(fit: CurveFit, o: SimOptions, qOf: (t: number) => number, a: number, b: number): Float64Array {
  const ebbs = context().ebbs, n = Math.round((b - a) / STEP) + 1;
  const from = CURVE_FROM_H * HOUR, len = curveSteps[curveSteps.length - 1] - from, cs = CURVE_STEP_MIN * MIN, ramp = 2 * HOUR;
  const sum = new Float64Array(n), wsum = new Float64Array(n);
  for (let k = 0; k < ebbs.length; k++) {
    const e = ebbs[k], start = e.thw + from;
    if (start + len < a || start > b) continue;
    const q = qOf(flowTime(o, e));
    const h = Number.isFinite(q) ? curveAt(fit, q, features(o, q, ebbs, k)) : null;
    if (!h) continue;
    const i0 = Math.max(0, Math.ceil((start - a) / STEP)), i1 = Math.min(n - 1, Math.floor((start + len - a) / STEP));
    for (let i = i0; i <= i1; i++) {
      const u = a + i * STEP - start, w = Math.min(1, u / ramp, (len - u) / ramp);
      if (w <= 0) continue;
      const j = Math.min(h.length - 2, Math.floor(u / cs)), f = u / cs - j;
      sum[i] += w * (h[j] * (1 - f) + h[j + 1] * f); wsum[i] += w;
    }
  }
  return sum.map((s, i) => wsum[i] ? s / wsum[i] : NaN);
}

/** Rate of change of ln(flow) per day over the `days` days before t0. */
function flowTrend(t0: number, days: number): number {
  const Q = getData().Q, [i0, i1] = Q.range(t0 - days * DAY, t0);
  let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = i0; i <= i1; i++) {
    if (!(Q.v[i] > 0)) continue;
    const x = (Q.time(i) - t0) / DAY, y = Math.log(Q.v[i]);
    n++; sx += x; sy += y; sxx += x * x; sxy += x * y;
  }
  if (n < 24) return 0;
  return (n * sxy - sx * sy) / (n * sxx - sx * sx);
}

export interface Simulation {
  t0: number; t1: number;
  /** Simulated level from what was known at t0, and the same with the flow that really came.
   *  Both start a day before t0 (for the level correction) and run 6 h past t1. */
  sim: Grid; simRealFlow: Grid;
  /** Flow used (from the last 12 h at t0) and the real flow, hourly, at the cycle flow times. */
  flow: { t: number; assumed: number; real: number }[];
  q0: number; bias: number; fold: number | null; opts: SimOptions;
}

/** Simulates `days` days from local midnight t0, using only the flow and level known at t0. A start
 *  inside the gauge record is simulated with the fold fit that left it out; `fold` overrides that. */
export function simulate(t0: number, days = 7, o: SimOptions = SIM_DEFAULTS, fold?: number | null): Simulation {
  const d = getData(), t1 = t0 + days * DAY;
  if (fold === undefined) fold = t0 < d.H.tEnd ? foldOf(t0 + days * DAY / 2) : null;
  const fit = levelFit(o, fold);

  let q0 = d.Q.stats(t0 - 12 * HOUR, t0).mean;
  if (!Number.isFinite(q0)) { const [, i] = d.Q.range(d.Q.t0, t0); for (let j = i; j >= 0 && !Number.isFinite(q0); j--) q0 = d.Q.v[j]; }
  const trend = flowTrend(t0, 3), rising = trend > o.riseMin;
  const rate = rising ? Math.min(o.riseMax, trend) : trend < 0 ? Math.max(-o.recessionMax, trend) : 0;
  const scenario = (t: number) => {
    const x = Math.max(0, t - (t0 - 6 * HOUR)) / DAY, k = rising ? o.riseDays : o.recessionDays;
    return q0 * Math.exp(rate * (Number.isFinite(k) ? k * (1 - Math.exp(-x / k)) : x));
  };
  const known = (t: number) => {
    if (t - 12 * HOUR >= t0) return scenario(t);
    const v = d.Q.stats(t - 12 * HOUR, Math.min(t + 12 * HOUR, t0)).mean;
    return Number.isFinite(v) ? v : scenario(t);
  };
  const real = (t: number) => { const v = d.Q24.at(t); return Number.isFinite(v) ? v : known(t); };

  const a = t0 - DAY, b = t1 + 6 * HOUR;
  const raw = stitch(fit, o, known, a, b), rawReal = stitch(fit, o, real, a, b);
  let bias = 0;
  if (o.tauH > 0) {
    let s = 0, c = 0;
    for (let i = 0; a + i * STEP <= t0; i++) { const r = d.H.at(a + i * STEP) - raw[i]; if (Number.isFinite(r)) { s += r; c++; } }
    if (c >= 36) bias = Math.max(-o.biasCap, Math.min(o.biasCap, s / c));
  }
  const shift = (i: number) => { const t = a + i * STEP; return bias * (t <= t0 ? 1 : Math.exp(-(t - t0) / (o.tauH * HOUR))); };
  const sim = new Grid(a, STEP, raw.map((h, i) => h + shift(i)));
  const simRealFlow = new Grid(a, STEP, rawReal.map((h, i) => h + shift(i)));

  const flow: Simulation["flow"] = [];
  for (let t = t0; t <= t1; t += HOUR) {
    const ft = t - o.qlagH * HOUR;
    flow.push({ t, assumed: known(ft), real: d.Q24.at(ft) });
  }
  return { t0, t1, sim, simRealFlow, flow, q0, bias, fold, opts: o };
}

// ---------------------------------------------------------------- comparison
/** Every tidal high in [a, b]: the lows of the level turned upside down. */
function detectHighs(g: Grid, a: number, b: number): Low[] {
  const [i0, i1] = g.range(a - 5 * HOUR, b + 5 * HOUR);
  if (i0 > i1) return [];
  const flip = new Grid(g.time(i0), g.step, g.v.slice(i0, i1 + 1).map((x) => -x));
  return detectLows(flip, a, b).map((l) => ({ tmin: l.tmin, hmin: -l.hmin }));
}

/** A low (or high) seen in the gauge record and/or in the simulation, paired when within 3 h,
 *  with the wave window around each low. */
export interface Turn {
  obs: Low | null; sim: Low | null;
  obsWindow: [number, number] | null; simWindow: [number, number] | null;
}

function pair(obs: Low[], sim: Low[]): Turn[] {
  const out: Turn[] = [], used = new Set<Low>();
  for (const s of sim) {
    let best: Low | null = null;
    for (const o of obs) if (!used.has(o) && Math.abs(o.tmin - s.tmin) <= 3 * HOUR &&
      (!best || Math.abs(o.tmin - s.tmin) < Math.abs(best.tmin - s.tmin))) best = o;
    if (best) used.add(best);
    out.push({ obs: best, sim: s, obsWindow: null, simWindow: null });
  }
  for (const o of obs) if (!used.has(o)) out.push({ obs: o, sim: null, obsWindow: null, simWindow: null });
  return out.sort((x, y) => (x.sim ?? x.obs)!.tmin - (y.sim ?? y.obs)!.tmin);
}

export function lows(s: Simulation, g: Grid = s.sim): Turn[] {
  const H = getData().H;
  return pair(detectLows(H, s.t0, s.t1), detectLows(g, s.t0, s.t1)).map((x) => ({ ...x,
    obsWindow: x.obs && observedWindow(H, x.obs.tmin), simWindow: x.sim && observedWindow(g, x.sim.tmin) }));
}

export const highs = (s: Simulation, g: Grid = s.sim): Turn[] =>
  pair(detectHighs(getData().H, s.t0, s.t1), detectHighs(g, s.t0, s.t1));

/** Simulated minus real level over the week (only where both exist). */
export function levelErrors(s: Simulation, g: Grid = s.sim): { t: number; err: number }[] {
  const H = getData().H, out: { t: number; err: number }[] = [];
  for (let t = s.t0; t <= s.t1; t += STEP) {
    const err = g.at(t) - H.at(t);
    if (Number.isFinite(err)) out.push({ t, err });
  }
  return out;
}

// ---------------------------------------------------------------- page
export interface WeekView {
  t0: number; t1: number; now: number;
  /** Every STEP: real level (NaN where there is none), simulated, simulated with the real flow,
   *  and the Montjean flow assumed and real (each at t minus the travel time). */
  points: { t: number; real: number; sim: number; simReal: number; qAssumed: number; qReal: number }[];
  lows: (Turn & { coef: number | null })[];
  /** Over the part of the week with gauge data: n points, RMSE and mean error (m), for both runs. */
  errors: { n: number; rmse: number; mean: number; rmseReal: number };
  q0: number; bias: number; fold: number | null; coefs: [number, number] | null;
}

/** `fold` as for simulate: null uses the fit on the whole record (for a forecast). */
export function weekView(t0: number, coefAt: ((t: number) => number) | null, fold?: number | null): WeekView {
  const s = simulate(t0, 7, SIM_DEFAULTS, fold), d = getData();
  const points: WeekView["points"] = [];
  const known = new Map(s.flow.map((f) => [f.t, f]));
  for (let t = s.t0; t <= s.t1; t += STEP) {
    const f = known.get(t - (t - s.t0) % HOUR)!;
    points.push({ t, real: d.H.at(t), sim: s.sim.at(t), simReal: s.simRealFlow.at(t), qAssumed: f.assumed, qReal: f.real });
  }
  const e = levelErrors(s), er = levelErrors(s, s.simRealFlow);
  const rms = (x: { err: number }[]) => Math.sqrt(x.reduce((a, p) => a + p.err ** 2, 0) / x.length);
  const coef = (t: number) => coefAt ? coefAt(t - 11 * HOUR) : null;   // the Saint-Nazaire high water ~11 h before the low
  const lowsOut = lows(s).map((x) => ({ ...x, coef: coef((x.sim ?? x.obs)!.tmin) }));
  let coefs: [number, number] | null = null;
  if (coefAt) {
    const cs: number[] = [];
    for (let t = s.t0; t <= s.t1; t += 6 * HOUR) cs.push(coefAt(t));
    coefs = [Math.min(...cs), Math.max(...cs)];
  }
  return { t0: s.t0, t1: s.t1, now: Date.now(), points, lows: lowsOut,
    errors: { n: e.length, rmse: e.length ? rms(e) : NaN, mean: e.length ? e.reduce((a, p) => a + p.err, 0) / e.length : NaN,
      rmseReal: er.length ? rms(er) : NaN },
    q0: s.q0, bias: s.bias, fold: s.fold, coefs };
}
