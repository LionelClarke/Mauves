import type { Series } from "./store.js";

/** A regularly sampled series; NaN marks missing values. */
export class Grid {
  constructor(public t0: number, public step: number, public v: Float64Array) {}
  get n() { return this.v.length; }
  get tEnd() { return this.t0 + (this.n - 1) * this.step; }
  time(i: number) { return this.t0 + i * this.step; }
  /** Index range [i0, i1] of grid points with a <= t <= b (i0 > i1 when empty). */
  range(a: number, b: number): [number, number] {
    const i0 = Math.max(0, Math.ceil((a - this.t0) / this.step));
    const i1 = Math.min(this.n - 1, Math.floor((b - this.t0) / this.step));
    return [i0, i1];
  }
  /** Linear interpolation at t (NaN outside or next to a gap). */
  at(t: number): number {
    const x = (t - this.t0) / this.step;
    const i = Math.floor(x);
    if (i < 0 || i >= this.n) return NaN;
    if (i === this.n - 1) return x === i ? this.v[i] : NaN;
    const f = x - i;
    return this.v[i] * (1 - f) + this.v[i + 1] * f;
  }
  /** Min / max / mean / count of non-missing values in [a, b]. */
  stats(a: number, b: number) {
    const [i0, i1] = this.range(a, b);
    let min = Infinity, max = -Infinity, sum = 0, count = 0, argmin = -1, missing = 0;
    for (let i = i0; i <= i1; i++) {
      const x = this.v[i];
      if (Number.isNaN(x)) { missing++; continue; }
      count++; sum += x;
      if (x < min) { min = x; argmin = i; }
      if (x > max) max = x;
    }
    return { min, max, mean: count ? sum / count : NaN, count, missing, argmin, i0, i1 };
  }
}

/** Resample to a regular grid (bin mean), fill gaps up to `limit` steps by linear
 *  interpolation, then smooth with a centered moving average of `smooth` points. */
export function regular(s: Series, step: number, limit: number, smooth = 1): Grid {
  if (s.t.length === 0) return new Grid(0, step, new Float64Array(0));
  const t0 = Math.floor(s.t[0] / step) * step;
  const n = Math.floor((s.t[s.t.length - 1] - t0) / step) + 1;
  const sum = new Float64Array(n), cnt = new Uint32Array(n);
  for (let k = 0; k < s.t.length; k++) {
    const i = Math.round((s.t[k] - t0) / step);
    if (i >= 0 && i < n && Number.isFinite(s.v[k])) { sum[i] += s.v[k]; cnt[i]++; }
  }
  const v = new Float64Array(n);
  for (let i = 0; i < n; i++) v[i] = cnt[i] ? sum[i] / cnt[i] : NaN;
  // interpolate inside short gaps
  let last = -1;
  for (let i = 0; i < n; i++) {
    if (Number.isNaN(v[i])) continue;
    if (last >= 0 && i - last > 1 && i - last - 1 <= limit) {
      for (let j = last + 1; j < i; j++) v[j] = v[last] + (v[i] - v[last]) * (j - last) / (i - last);
    }
    last = i;
  }
  if (smooth <= 1) return new Grid(t0, step, v);
  const h = Math.floor(smooth / 2), out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s2 = 0, c = 0;
    for (let j = Math.max(0, i - h); j <= Math.min(n - 1, i + h); j++) {
      if (!Number.isNaN(v[j])) { s2 += v[j]; c++; }
    }
    out[i] = Number.isNaN(v[i]) ? NaN : s2 / c;
  }
  return new Grid(t0, step, out);
}

/** Centered moving minimum over +/- half points, ignoring NaN (monotonic deque). */
export function rollingMin(v: Float64Array, half: number, i0 = 0, i1 = v.length - 1): Float64Array {
  const out = new Float64Array(v.length).fill(NaN);
  const dq: number[] = [];
  let head = 0, next = Math.max(0, i0 - half);
  for (let i = i0; i <= i1; i++) {
    const hi = Math.min(v.length - 1, i + half);
    for (; next <= hi; next++) {
      if (Number.isNaN(v[next])) continue;
      while (dq.length > head && v[dq[dq.length - 1]] >= v[next]) dq.pop();
      dq.push(next);
    }
    while (dq.length > head && dq[head] < i - half) head++;
    out[i] = dq.length > head ? v[dq[head]] : NaN;
  }
  return out;
}

/** Centered moving mean over +/- half points with a minimum number of values. */
export function rollingMean(g: Grid, half: number, minPeriods: number): Grid {
  const n = g.n, out = new Float64Array(n);
  let sum = 0, cnt = 0;
  const add = (j: number, sgn: number) => {
    if (j >= 0 && j < n && !Number.isNaN(g.v[j])) { sum += sgn * g.v[j]; cnt += sgn; }
  };
  for (let j = -half; j <= half - 1; j++) add(j, 1);
  for (let i = 0; i < n; i++) {
    add(i + half, 1);
    out[i] = cnt >= minPeriods ? sum / cnt : NaN;
    add(i - half, -1);
  }
  return new Grid(g.t0, g.step, out);
}
