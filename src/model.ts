/** Wave model: finds lows in the gauge record, pairs each with the Saint-Nazaire ebb before it, and
 *  learns the falling curve at Mauves from that ebb and the Loire flow. The wave window and the
 *  low are both read off the predicted curve. */
import { BAND_MID, CURVE_FROM_H, CURVE_STEP_MIN, CURVE_TO_H, DAY, FLOW_BW, FLOW_NODE_STEP, HOUR, LOWER, MIN,
  MIN_EVENTS, QLAG_CANDIDATES, UPPER } from "./config.js";
import { ebbsFrom, fitTide, tideAt, type Ebb, type TideFit } from "./harmonic.js";
import { cvRmse, dot, lstsqMulti, median, normCdf } from "./linalg.js";
import { Grid, regular, rollingMean, rollingMin } from "./series.js";
import { dataVersion, loadModel, loadSeries, loadSessions, saveModel } from "./store.js";
import { coefficientAt, tideFits } from "./almanac.js";

// ---------------------------------------------------------------- data
export interface Data { H: Grid; Q: Grid; Q24: Grid; rawLast: { t: number; v: number } | null }
let cached: { version: number; data: Data } | null = null;

export function getData(): Data {
  if (cached && cached.version === dataVersion()) return cached.data;
  const hs = loadSeries("mauves_H"), qs = loadSeries("montjean_Q");
  const H = regular(hs, 5 * MIN, 24, 3);
  const Q = regular(qs, HOUR, 6, 1);
  const data: Data = { H, Q, Q24: rollingMean(Q, 12, 6),
    rawLast: hs.t.length ? { t: hs.t[hs.t.length - 1], v: hs.v[hs.v.length - 1] } : null };
  cached = { version: dataVersion(), data };
  return data;
}

// ---------------------------------------------------------------- features
export const lq = (q: number) => Math.log(q) - Math.log(300);
/** The ebb at Saint-Nazaire and the flow. Kept linear: the fit is local in ln(flow). */
export const xTide = (q: number, e: Ebb) => [1, lq(q), e.hw - 5.5, e.lw - 1, (e.tmid - e.thw) / HOUR - 3];
/** Only to choose the Montjean lag: a global polynomial for the level of the low. */
const xLag = (q: number, e: Ebb) => {
  const a = lq(q), b = e.lw - 1, c = e.hw - 5.5;
  return [1, a, b, c, a * b, a * c, b * b, c * c, b * c, a * a, a * a * a];
};
const nearWeight = (h: number) => 1 / (1 + ((h - BAND_MID) / 0.5) ** 2);

// ---------------------------------------------------------------- lows
export interface Low { tmin: number; hmin: number }

/** Every tidal low at Mauves between a and b, found directly in the gauge record. */
export function detectLows(H: Grid, a = H.t0, b = H.tEnd): Low[] {
  if (!H.n) return [];
  const half = Math.round(4 * HOUR / H.step);
  const [i0, i1] = H.range(a, b);
  if (i0 > i1) return [];
  const rmin = rollingMin(H.v, half, i0, i1);
  const lows: [number, number][] = [];
  for (let i = i0; i <= i1; i++) {
    const v = H.v[i];
    if (Number.isNaN(v) || v !== rmin[i]) continue;
    const last = lows[lows.length - 1];
    if (last && i - last[0] < (6 * HOUR) / H.step) { if (v < last[1]) lows[lows.length - 1] = [i, v]; continue; }
    lows.push([i, v]);
  }
  const out: Low[] = [];
  for (const [i, h] of lows) {
    if (i - half < 0 || i + half >= H.n) continue;
    let lmax = -Infinity, rmax = -Infinity, bad = false;
    for (let j = i - half; j <= i + half; j++) {
      const x = H.v[j];
      if (Number.isNaN(x)) { bad = true; break; }
      if (j <= i) lmax = Math.max(lmax, x);
      if (j >= i) rmax = Math.max(rmax, x);
    }
    if (bad || lmax - h < 0.02 || rmax - h < 0.02) continue;
    out.push({ tmin: H.time(i), hmin: h });
  }
  return out;
}

/** Hours before the low when the falling level passed through `level` (NaN if it didn't). */
export function fallOffset(H: Grid, tmin: number, hmin: number, level: number): number {
  if (hmin >= level - 0.02) return NaN;
  const [i0, i1] = H.range(tmin - 9 * HOUR, tmin);
  let k = -1;
  for (let i = i0; i <= i1; i++) if (!Number.isNaN(H.v[i]) && H.v[i] >= level) k = i;
  if (k < 0 || k + 1 > i1 || Number.isNaN(H.v[k + 1])) return NaN;
  const h1 = H.v[k], h2 = H.v[k + 1];
  const tc = H.time(k) + H.step * (h1 !== h2 ? (h1 - level) / (h1 - h2) : 0);
  return (tmin - tc) / HOUR;
}

/** Observed wave window: falling tide, from UPPER down to LOWER (or to the low). */
export function observedWindow(H: Grid, tmin: number): [number, number] | null {
  const hmin = H.stats(tmin - 30 * MIN, tmin + 30 * MIN).min;
  if (!Number.isFinite(hmin)) return null;
  const a = fallOffset(H, tmin, hmin, UPPER);
  if (!Number.isFinite(a)) return null;
  let b = hmin < LOWER ? fallOffset(H, tmin, hmin, LOWER) : 0;
  if (!Number.isFinite(b)) b = 0;          // low only just below LOWER: session ends at the low
  if (a - b < 1 / 6) return null;
  return [tmin - a * HOUR, tmin - b * HOUR];
}

// ---------------------------------------------------------------- Saint-Nazaire tide
/** Ebbs with high water in [a, b], from the harmonic fit of the gauge record. */
export function ebbsBetween(m: Pick<Model, "tide">, a: number, b: number): Ebb[] {
  return ebbsFrom((t) => tideAt(m.tide, t), a, b);
}

/** The ebb behind the Mauves low at `tmin`: the last Saint-Nazaire low water 0.5 to 9 h before it. */
function ebbFor(ebbs: Ebb[], tmin: number): Ebb | null {
  let out: Ebb | null = null;
  for (const e of ebbs) if (e.tlw <= tmin - 0.5 * HOUR && e.tlw >= tmin - 9 * HOUR) out = e;
  return out;
}

// ---------------------------------------------------------------- events
export interface Event extends Low { q: number; ebb: Ebb }

function buildEvents(d: Data, lows: Low[], ebbs: Ebb[], qlag: number): Event[] {
  const out: Event[] = [];
  let j = 0;
  for (const lo of lows) {
    while (j < ebbs.length && ebbs[j].tlw < lo.tmin - 9 * HOUR) j++;
    let ebb: Ebb | null = null;
    for (let k = j; k < ebbs.length && ebbs[k].tlw <= lo.tmin - 0.5 * HOUR; k++) ebb = ebbs[k];
    const q = d.Q24.at(lo.tmin - qlag * HOUR);
    if (ebb && Number.isFinite(q)) out.push({ ...lo, q, ebb });
  }
  return out;
}

// ---------------------------------------------------------------- falling curve
/** Offsets from the Saint-Nazaire high water at which the curve is sampled. */
export const curveSteps = Array.from({ length: Math.round((CURVE_TO_H - CURVE_FROM_H) * 60 / CURVE_STEP_MIN) + 1 },
  (_, k) => CURVE_FROM_H * HOUR + k * CURVE_STEP_MIN * MIN);

/** Mauves level after each Saint-Nazaire high water, fitted at nodes in ln(flow):
 *  beta[node][step] are coefficients on the features (null where too few tides had a flow near that node). */
export interface CurveFit { lq0: number; dlq: number; beta: (number[][] | null)[] }
/** One tide: the flow, its features (xTide here) and the Mauves level at each of `curveSteps`. */
export type CurveRow = { q: number; x: number[]; y: number[] };

export function fitCurve(rows: CurveRow[], bw = FLOW_BW): CurveFit {
  const lqs = rows.map((r) => lq(r.q)), X = rows.map((r) => r.x), Y = rows.map((r) => r.y);
  const lq0 = Math.floor(Math.min(...lqs) / FLOW_NODE_STEP) * FLOW_NODE_STEP;
  const n = Math.ceil((Math.max(...lqs) - lq0) / FLOW_NODE_STEP) + 1;
  const beta: CurveFit["beta"] = [];
  for (let k = 0; k < n; k++) {
    const node = lq0 + k * FLOW_NODE_STEP;
    const w = lqs.map((x) => { const z = Math.exp(-0.5 * ((x - node) / bw) ** 2); return z < 1e-4 ? 0 : z; });
    const sw = w.reduce((a, x) => a + x, 0), sw2 = w.reduce((a, x) => a + x * x, 0);
    beta.push(sw * sw / (sw2 || 1) < 2 * MIN_EVENTS ? null
      : lstsqMulti(X, Y, w).map((b) => b.map((x) => Math.round(x * 1e5) / 1e5)));
  }
  return { lq0, dlq: FLOW_NODE_STEP, beta };
}

/** Levels at each of `curveSteps` for flow q and features x, interpolated between flow nodes
 *  (clamped to the outermost fitted ones). Null: no fit. */
export function curveAt(c: CurveFit, q: number, x: number[]): number[] | null {
  const valid = c.beta.flatMap((b, i) => b ? [i] : []);
  if (!valid.length) return null;
  const pos = Math.max(valid[0], Math.min(valid[valid.length - 1], (lq(q) - c.lq0) / c.dlq));
  const i0 = valid.filter((i) => i <= pos).pop()!, i1 = valid.find((i) => i >= pos)!;
  const f = i1 === i0 ? 0 : (pos - i0) / (i1 - i0);
  return curveSteps.map((_, k) => (1 - f) * dot(x, c.beta[i0]![k]) + f * dot(x, c.beta[i1]![k]));
}

/** Predicted Mauves level after the ebb's high water, shifted by `shift` m (null: no fit). */
export function predictCurve(m: Pick<Model, "curve">, q: number, e: Ebb, shift = 0): { t: number; h: number }[] | null {
  const h = curveAt(m.curve, q, xTide(q, e));
  return h && curveSteps.map((s, k) => ({ t: e.thw + s, h: h[k] + shift }));
}

/** The low on a predicted curve: its minimum from 4 h after the Saint-Nazaire high water. */
export function curveLow(p: { t: number; h: number }[], hwTime: number): Low {
  let k = -1;
  for (let i = 0; i < p.length; i++) if (p[i].t >= hwTime + 4 * HOUR && (k < 0 || p[i].h < p[k].h)) k = i;
  return { tmin: p[k].t, hmin: p[k].h };
}

/** Wave window read off a predicted curve: from its high, down through UPPER, until it passes
 *  LOWER or turns at the low. Null if the curve never falls through UPPER. */
export function curveWindow(p: { t: number; h: number }[], hwTime: number): [number, number] | null {
  let k = 0;
  for (let i = 1; i < p.length && p[i].t <= hwTime + 4 * HOUR; i++) if (p[i].h > p[k].h) k = i;
  const cross = (i: number, level: number) => p[i].t + (p[i].h - level) / (p[i].h - p[i + 1].h) * (p[i + 1].t - p[i].t);
  let a = NaN;
  for (let i = k; i < p.length - 1; i++) {
    const h1 = p[i].h, h2 = p[i + 1].h;
    if (Number.isNaN(a)) {
      if (h2 >= h1) return null;                      // turned before reaching UPPER
      if (h1 >= UPPER && h2 < UPPER) a = cross(i, UPPER);
      else continue;
    }
    if (h1 >= LOWER && h2 < LOWER) return [a, cross(i, LOWER)];
    if (h2 >= h1) return p[i].t - a >= 10 * MIN ? [a, p[i].t] : null;   // low above LOWER: ends at the low
  }
  return null;
}

// ---------------------------------------------------------------- calibration
/** Bump when Model changes shape, so older model.json files are refitted. */
export const MODEL_FORMAT = 3;

export interface Model {
  format: number; created: number; nEvents: number; period: [number, number];
  qRange: [number, number]; qlagH: number;
  /** Harmonic fit of the Saint-Nazaire gauge record. */
  tide: TideFit;
  curve: CurveFit;
  /** Cross-validated errors of the low: level (near the band) and time. */
  rmseHmin: number; rmseLowMin: number;
  validation: { n: number; hit: number; total: number; startRmseMin: number | null; endRmseMin: number | null };
  dataVersion: number;
}

export const NO_TIDE = "No Saint-Nazaire tides yet: put the SHOM gauge files in the maregraphie folder.";

export const isCurrent = (m: Model | null): m is Model => !!m && m.format === MODEL_FORMAT;

export function calibrate(): Model {
  const d = getData();
  if (!d.H.n || !d.Q.n) throw new Error("No gauge data yet.");
  const tide = fitTide(loadSeries("stnazaire_H"));
  if (!tide) throw new Error(NO_TIDE);
  const ebbs = ebbsBetween({ tide }, d.H.t0 - DAY, d.H.tEnd);
  if (ebbs.length < MIN_EVENTS) throw new Error(NO_TIDE);
  const lows = detectLows(d.H);

  let best: { r: number; ql: number } | null = null;
  for (const ql of QLAG_CANDIDATES) {
    const ev = buildEvents(d, lows, ebbs, ql);
    if (ev.length < 2 * MIN_EVENTS) continue;
    const r = cvRmse(ev.map((e) => xLag(e.q, e.ebb)), ev.map((e) => e.hmin),
      { w: ev.map((e) => nearWeight(e.hmin)), center: BAND_MID, nearBand: 0.75 });
    if (!best || r < best.r) best = { r, ql };
  }
  if (!best) throw new Error(`Fewer than ${2 * MIN_EVENTS} low tides have gauge data and a Saint-Nazaire tide.`);
  const ev = buildEvents(d, lows, ebbs, best.ql);
  const rows: (CurveRow & { e: Event })[] = ev.map((e) => ({ e, q: e.q, x: xTide(e.q, e.ebb),
    y: curveSteps.map((s) => d.H.at(e.ebb.thw + s)) }))
    .filter((r) => r.y.every(Number.isFinite));
  if (rows.length < 2 * MIN_EVENTS) throw new Error(`Only ${rows.length} low tides have a complete falling curve.`);
  const curve = fitCurve(rows);

  // validation: blocks of months, each predicted from a fit without its block
  const FOLDS = 6, block = (t: number) => Math.floor(t / (30 * DAY)) % FOLDS;
  let hit = 0, total = 0;
  const es: number[] = [], ee: number[] = [], eh: number[] = [], near: boolean[] = [], et: number[] = [];
  for (let f = 0; f < FOLDS; f++) {
    const train = rows.filter((r) => block(r.e.tmin) !== f);
    if (train.length < 2 * MIN_EVENTS) continue;
    const cf = { curve: fitCurve(train) };
    for (const r of rows.filter((r) => block(r.e.tmin) === f)) {
      const p = predictCurve(cf, r.e.q, r.e.ebb);
      if (!p) continue;
      const w = curveWindow(p, r.e.ebb.thw), obs = observedWindow(d.H, r.e.tmin), low = curveLow(p, r.e.ebb.thw);
      total++; hit += Number(!!w === !!obs);
      if (w && obs) { es.push((w[0] - obs[0]) / MIN); ee.push((w[1] - obs[1]) / MIN); }
      eh.push(low.hmin - r.e.hmin); near.push(Math.abs(r.e.hmin - BAND_MID) < 0.75); et.push((low.tmin - r.e.tmin) / MIN);
    }
  }
  const rms = (a: number[]) => a.length ? Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length) : null;
  const ehNear = eh.filter((_, i) => near[i]);
  const qs = rows.map((r) => r.e.q);
  const model: Model = {
    format: MODEL_FORMAT, created: Date.now(), nEvents: rows.length, period: [rows[0].e.tmin, rows[rows.length - 1].e.tmin],
    qRange: [Math.min(...qs), Math.max(...qs)], qlagH: best.ql, tide, curve,
    rmseHmin: rms(ehNear.length >= 10 ? ehNear : eh) ?? 0.1, rmseLowMin: rms(et) ?? 30,
    validation: { n: es.length, hit, total, startRmseMin: rms(es), endRmseMin: rms(ee) },
    dataVersion: dataVersion(),
  };
  saveModel(model);
  return model;
}

// ---------------------------------------------------------------- forecast
export interface ForecastRow {
  tmin: number; snLow: number; coef: number | null; q: number; hmin: number;
  window: [number, number] | null; prob: number; endsTooLow: boolean;
  status: "forecast" | "observed";
}
export interface Forecast {
  rows: ForecastRow[]; qNow: number; qUsed: number; flowGiven: boolean; bias: number;
  now: { t: number; h: number; trend: number } | null; extrapolated: boolean; model: Model;
}

export function currentModel(): Model {
  const m = loadModel<Model>();
  return isCurrent(m) ? m : calibrate();
}

/** Tidal coefficient at a Saint-Nazaire high water, from the Brest fit (null without a Brest record). */
const coefOrNull = (t: number) => { const b = tideFits().brest; return b ? coefficientAt(b, t) : null; };

export function forecast(days = 7, flow?: number): Forecast {
  const model = currentModel(), d = getData(), now = Date.now(), horizon = now + days * DAY;
  let qNow = d.Q.stats(now - 6 * HOUR, now).mean;
  if (!Number.isFinite(qNow) && d.Q.n) qNow = d.Q.stats(d.Q.tEnd - 12 * HOUR, d.Q.tEnd).mean;
  const qUsed = flow ?? qNow;
  const qFor = (t: number) => {
    const qc = t - model.qlagH * HOUR;
    if (d.Q.n && qc + 12 * HOUR <= d.Q.tEnd) { const v = d.Q.stats(qc - 12 * HOUR, qc + 12 * HOUR).mean; if (Number.isFinite(v)) return v; }
    return qUsed;
  };
  const ebbs = ebbsBetween(model, now - 6 * DAY, horizon);

  // correction from the most recent observed lows (wind, surge, gauge drift ...)
  const res: number[] = [];
  for (const lo of detectLows(d.H, now - 5 * DAY, now)) {
    const e = ebbFor(ebbs, lo.tmin), p = e && predictCurve(model, qFor(lo.tmin), e);
    if (e && p) res.push(lo.hmin - curveLow(p, e.thw).hmin);
  }
  const last4 = res.slice(-4);
  const bias = last4.length ? Math.max(-0.3, Math.min(0.3, last4.reduce((s, x) => s + x, 0) / last4.length)) : 0;

  const rows: ForecastRow[] = [];
  for (const e of ebbs) {
    const guess = e.thw + 11 * HOUR, q = qFor(guess);
    const lead = Math.max(0, (guess - now) / DAY);
    const p = predictCurve(model, q, e, bias * Math.exp(-lead / 2));
    if (!p) continue;
    let { tmin, hmin: h } = curveLow(p, e.thw), window = curveWindow(p, e.thw);
    if (tmin <= now - 10 * HOUR || tmin >= horizon) continue;
    const sigma = model.rmseHmin * (1 + 0.1 * lead);
    let prob = normCdf((UPPER - h) / sigma), endsTooLow = h < LOWER;
    let status: ForecastRow["status"] = "forecast";
    const st = d.H.stats(tmin - 150 * MIN, tmin + 150 * MIN);
    if (tmin + 2 * HOUR < now && st.count > 20 && st.missing === 0) {
      status = "observed"; h = st.min; tmin = d.H.time(st.argmin);
      window = observedWindow(d.H, tmin); prob = window ? 1 : 0; endsTooLow = h < LOWER;
    }
    rows.push({ tmin, snLow: e.tlw, coef: coefOrNull(e.thw), q, hmin: h, window, prob, endsTooLow, status });
  }
  let nowInfo: Forecast["now"] = null;
  if (d.rawLast) {
    const trend = d.H.at(d.H.tEnd) - d.H.at(d.H.tEnd - 30 * MIN);
    nowInfo = { t: d.rawLast.t, h: d.rawLast.v, trend: Number.isFinite(trend) ? trend : 0 };
  }
  const extrapolated = Number.isFinite(qUsed) && !(model.qRange[0] * 0.8 <= qUsed && qUsed <= model.qRange[1] * 1.25);
  return { rows, qNow, qUsed, flowGiven: flow !== undefined, bias, now: nowInfo, extrapolated, model };
}

// ---------------------------------------------------------------- sessions
export interface SessionCheck {
  start: number; end: number; note: string; index: number;
  hStart: number; hEnd: number; trendStart: number; trendEnd: number; min: number; max: number;
  lows: Low[]; observed: [number, number][]; outsideBand: boolean;
  model: { coef: number | null; q: number; hmin: number; window: [number, number] | null; predictedLow: number; snLow: number } | null;
}

export function checkSessions(): { checks: SessionCheck[]; upper: { value: number; n: number }; lower: { value: number; n: number } } {
  const d = getData(), m = loadModel<Model>();
  const checks = loadSessions().map((s, index): SessionCheck => {
    const tr = (t: number) => d.H.at(t + 20 * MIN) - d.H.at(t - 20 * MIN);
    const st = d.H.stats(s.start, s.end);
    const lows = detectLows(d.H, s.start - 9 * HOUR, s.end + 9 * HOUR);
    const observed = lows.map((l) => observedWindow(d.H, l.tmin)).filter((w): w is [number, number] =>
      !!w && w[1] > s.start - 3 * HOUR && w[0] < s.end + 3 * HOUR);
    let model: SessionCheck["model"] = null;
    if (isCurrent(m) && lows.length) {
      const mid = (s.start + s.end) / 2;
      const lo = lows.reduce((a, b) => Math.abs(b.tmin - mid) < Math.abs(a.tmin - mid) ? b : a);
      const e = ebbFor(ebbsBetween(m, lo.tmin - 16 * HOUR, lo.tmin), lo.tmin);
      const q = d.Q.stats(lo.tmin - m.qlagH * HOUR - 12 * HOUR, lo.tmin - m.qlagH * HOUR + 12 * HOUR).mean;
      const p = e && Number.isFinite(q) ? predictCurve(m, q, e) : null;
      if (e && p) {
        const low = curveLow(p, e.thw);
        model = { coef: coefOrNull(e.thw), q, hmin: low.hmin, window: curveWindow(p, e.thw),
          predictedLow: low.tmin, snLow: e.tlw };
      }
    }
    return { ...s, index, hStart: d.H.at(s.start), hEnd: d.H.at(s.end), trendStart: tr(s.start), trendEnd: tr(s.end),
      min: st.min, max: st.max, lows, observed, model,
      outsideBand: st.count > 0 && (st.max > UPPER + 0.15 || st.min < LOWER - 0.15) };
  });
  const up = checks.filter((c) => c.trendStart < -0.01 && Number.isFinite(c.hStart)).map((c) => c.hStart);
  const lo = checks.filter((c) => c.trendEnd < -0.01 && Number.isFinite(c.hEnd)).map((c) => c.hEnd);
  return { checks, upper: { value: median(up), n: up.length }, lower: { value: median(lo), n: lo.length } };
}
