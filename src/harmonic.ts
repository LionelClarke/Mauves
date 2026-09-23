/** Harmonic tide prediction for the SHOM gauges (Saint-Nazaire, Brest), fitted by least squares on their records.
 *  No nodal corrections: the fit uses at most the last 3 years, which keeps it within a few cm
 *  for the months ahead. Surge (wind, pressure) is not predictable this way. */
import { DAY, HOUR, MIN } from "./config.js";
import { dot, lstsq } from "./linalg.js";
import type { Series } from "./store.js";

/** Constituent speeds (degrees per hour), most important first: when the record is too short to
 *  separate two of them (Rayleigh criterion), the later one is left out. */
const CONSTITUENTS: [string, number][] = [
  ["M2", 28.9841042], ["S2", 30], ["N2", 28.4397295], ["K1", 15.0410686], ["O1", 13.9430356],
  ["M4", 57.9682084], ["MS4", 58.9841042], ["K2", 30.0821373], ["P1", 14.9589314], ["MN4", 57.4238337],
  ["M6", 86.9523127], ["2MS6", 87.9682084], ["NU2", 28.5125831], ["MU2", 27.9682084], ["2N2", 27.8953548],
  ["L2", 29.5284789], ["LAM2", 29.4556253], ["T2", 29.9589333], ["Q1", 13.3986609], ["MK3", 44.0251729],
  ["M3", 43.4761563], ["2MK3", 42.9271398], ["MK4", 59.0662415], ["SN4", 58.4397295], ["S4", 60],
  ["2MN6", 86.407938], ["2SM6", 88.9841042], ["MSK6", 89.0662415], ["M8", 115.9364166], ["3MS8", 116.9523127],
  ["3MN8", 115.392], ["MNS2", 27.4238337], ["MSN2", 30.5443747], ["2SM2", 31.0158958], ["J1", 15.5854433],
  ["OO1", 16.1391017], ["M1", 14.4966939], ["RHO", 13.4715145], ["2Q1", 12.8542862], ["S1", 15],
  ["R2", 30.0410667], ["3MS4", 56.9523127], ["SK4", 60.0821373], ["2MK6", 88.0503457], ["S6", 90],
  ["MF", 1.0980331], ["MSF", 1.0158958], ["MM", 0.5443747], ["SSA", 0.0821373], ["SA", 0.0410686],
];

export interface TideFit {
  t0: number; names: string[]; speeds: number[]; beta: number[];
  from: number; to: number; rmse: number;
}

const RAD = Math.PI / 180;
function row(t0: number, speeds: number[], t: number): number[] {
  const h = (t - t0) / HOUR, x = [1];
  for (const w of speeds) { const a = w * h * RAD; x.push(Math.cos(a), Math.sin(a)); }
  return x;
}

/** Fit on the last `years` of the record (30-minute samples). Null with less than 30 days. */
export function fitTide(s: Series, years = 3): TideFit | null {
  if (!s.t.length) return null;
  const to = s.t[s.t.length - 1], from = Math.max(s.t[0], to - years * 365.25 * DAY);
  if (to - from < 30 * DAY) return null;
  const spanH = (to - from) / HOUR, chosen: [string, number][] = [];
  for (const c of CONSTITUENTS) {
    if ([0, ...chosen.map((x) => x[1])].every((w) => Math.abs(w - c[1]) * spanH >= 360)) chosen.push(c);
  }
  const speeds = chosen.map((c) => c[1]), t0 = Math.round(from / DAY) * DAY;
  const X: number[][] = [], y: number[] = [];
  for (let i = 0; i < s.t.length; i++) {
    if (s.t[i] < from || s.t[i] % (30 * MIN) !== 0 || !Number.isFinite(s.v[i])) continue;
    X.push(row(t0, speeds, s.t[i])); y.push(s.v[i]);
  }
  if (X.length < 2 * speeds.length + 50) return null;
  const beta = lstsq(X, y);
  const rmse = Math.sqrt(X.reduce((a, x, i) => a + (y[i] - dot(x, beta)) ** 2, 0) / X.length);
  return { t0, names: chosen.map((c) => c[0]), speeds, beta, from, to, rmse };
}

export const tideAt = (f: TideFit, t: number) => dot(row(f.t0, f.speeds, t), f.beta);

/** One ebb at Saint-Nazaire: the high water, the low water after it, and when the falling level
 *  passed half-way between them (sharper to time than a flat high water). Heights in m above chart datum. */
export interface Ebb { thw: number; hw: number; tlw: number; lw: number; tmid: number }

/** A high or low water (m above chart datum); `i` is its index in the sampled levels. */
export interface Extreme { t: number; h: number; high: boolean; i: number }

/** Samples `level` every `step` from t0 to t1 and finds the highs and lows (each the extreme of ±3 h). */
function scan(level: (t: number) => number, t0: number, t1: number, step: number) {
  const n = Math.ceil((t1 - t0) / step), v = new Float64Array(n);
  for (let i = 0; i < n; i++) v[i] = level(t0 + i * step);
  const half = Math.round(3 * HOUR / step), ext: Extreme[] = [];
  for (let i = half; i < n - half; i++) {
    let high = true, low = true;
    for (let k = -half; k <= half && (high || low); k++) {
      if (k === 0) continue;
      const w = v[i + k];
      if (!Number.isFinite(w) || !Number.isFinite(v[i])) { high = low = false; break; }
      if (w > v[i] || (w === v[i] && k < 0)) high = false;
      if (w < v[i] || (w === v[i] && k < 0)) low = false;
    }
    if (!high && !low) continue;
    // parabola through the three samples around the extreme
    const d = v[i - 1] - 2 * v[i] + v[i + 1], k0 = d ? Math.max(-1, Math.min(1, (v[i - 1] - v[i + 1]) / (2 * d))) : 0;
    ext.push({ i, t: t0 + (i + k0) * step, h: v[i] - (v[i - 1] - v[i + 1]) * k0 / 4, high });
  }
  return { v, ext };
}

/** High and low waters in [a, b). */
export function extremesFrom(level: (t: number) => number, a: number, b: number, step = 5 * MIN): Extreme[] {
  return scan(level, a - 4 * HOUR, b + 4 * HOUR, step).ext.filter((x) => x.t >= a && x.t < b);
}

/** Ebbs whose high water falls in [a, b], from a regularly sampled level function. */
export function ebbsFrom(level: (t: number) => number, a: number, b: number, step = 5 * MIN): Ebb[] {
  const t0 = a - 6 * HOUR, { v, ext } = scan(level, t0, b + 14 * HOUR, step);
  const out: Ebb[] = [];
  for (let j = 0; j + 1 < ext.length; j++) {
    const hi = ext[j], lo = ext[j + 1];
    if (!hi.high || lo.high || hi.t < a || hi.t > b || lo.t - hi.t > 9 * HOUR) continue;
    const mid = (hi.h + lo.h) / 2;
    let tmid = NaN;
    for (let i = hi.i; i < lo.i; i++) {
      if (v[i] >= mid && v[i + 1] < mid) { tmid = t0 + (i + (v[i] - mid) / (v[i] - v[i + 1])) * step; break; }
    }
    if (Number.isFinite(tmid)) out.push({ thw: hi.t, hw: hi.h, tlw: lo.t, lw: lo.h, tmid });
  }
  return out;
}

/** Amplitude (m) of the semi-diurnal part of the tide at time t: the envelope of the constituents
 *  between 27 and 31.5 degrees per hour, whose slow beating is the spring–neap cycle. */
export function semidiurnalAmplitude(f: TideFit, t: number): number {
  const h = (t - f.t0) / HOUR;
  let re = 0, im = 0;
  f.speeds.forEach((w, k) => {
    if (w < 27 || w > 31.5) return;
    // c cos(a) + s sin(a) is the real part of (c - i s) e^(i a)
    const c = f.beta[1 + 2 * k], s = f.beta[2 + 2 * k], a = w * h * RAD;
    re += c * Math.cos(a) + s * Math.sin(a);
    im += c * Math.sin(a) - s * Math.cos(a);
  });
  return Math.hypot(re, im);
}
