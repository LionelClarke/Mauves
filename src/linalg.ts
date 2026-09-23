/** Weighted least squares via the normal equations (feature counts here are tiny). */
export function lstsq(X: number[][], y: number[], w?: number[]): number[] {
  const p = X[0].length;
  const A = Array.from({ length: p }, () => new Array(p).fill(0));
  const b = new Array(p).fill(0);
  for (let i = 0; i < X.length; i++) {
    const wi = w ? w[i] : 1, xi = X[i];
    for (let j = 0; j < p; j++) {
      b[j] += wi * xi[j] * y[i];
      for (let k = 0; k < p; k++) A[j][k] += wi * xi[j] * xi[k];
    }
  }
  for (let j = 0; j < p; j++) A[j][j] += 1e-9 * (Math.abs(A[j][j]) || 1);
  return solve(A, b);
}

/** Weighted least squares for several targets sharing X and w: Y[i][j] is target j of row i.
 *  Returns one coefficient vector per target. */
export function lstsqMulti(X: number[][], Y: ArrayLike<number>[], w: number[]): number[][] {
  const p = X[0].length, m = Y[0].length;
  const A = Array.from({ length: p }, () => new Array(p).fill(0));
  const B = Array.from({ length: m }, () => new Array(p).fill(0));
  for (let i = 0; i < X.length; i++) {
    const wi = w[i], xi = X[i], yi = Y[i];
    if (!wi) continue;
    for (let j = 0; j < p; j++) {
      for (let k = 0; k < p; k++) A[j][k] += wi * xi[j] * xi[k];
      for (let s = 0; s < m; s++) B[s][j] += wi * xi[j] * yi[s];
    }
  }
  for (let j = 0; j < p; j++) A[j][j] += 1e-9 * (Math.abs(A[j][j]) || 1);
  return B.map((b) => solve(A, b));
}

function solve(A: number[][], b: number[]): number[] {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    const d = M[c][c] || 1e-12;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / d;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / (M[i][i] || 1e-12));
}

export const dot = (x: number[], b: number[]) => x.reduce((s, xi, i) => s + xi * b[i], 0);

/** k-fold cross-validated RMSE. With `near`, only scored on targets within `nearBand` of `center`. */
export function cvRmse(X: number[][], y: number[], opts: { k?: number; w?: number[];
  center?: number; nearBand?: number } = {}): number {
  const k = opts.k ?? 5, errs: number[] = [], keep: boolean[] = [];
  for (let f = 0; f < k; f++) {
    const tr: number[] = [], te: number[] = [];
    y.forEach((_, i) => (i % k === f ? te : tr).push(i));
    if (!te.length || tr.length <= X[0].length) continue;
    const beta = lstsq(tr.map((i) => X[i]), tr.map((i) => y[i]), opts.w && tr.map((i) => opts.w![i]));
    for (const i of te) {
      errs.push(y[i] - dot(X[i], beta));
      keep.push(opts.center === undefined || Math.abs(y[i] - opts.center) < (opts.nearBand ?? 0.75));
    }
  }
  let e = errs;
  if (opts.center !== undefined && keep.filter(Boolean).length >= 10) e = errs.filter((_, i) => keep[i]);
  return Math.sqrt(e.reduce((s, x) => s + x * x, 0) / Math.max(1, e.length));
}

export const median = (a: number[]) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export const normCdf = (x: number) => 0.5 * (1 + erf(x / Math.SQRT2));
function erf(x: number) {
  // Abramowitz & Stegun 7.1.26
  const s = Math.sign(x), a = Math.abs(x), t = 1 / (1 + 0.3275911 * a);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}
