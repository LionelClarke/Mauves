/** Server-side SVG: the gauge staff and the level chart. */
import { DAY, HOUR, LOWER, TZ, UPPER } from "./config.js";
import { DateTime } from "luxon";
import type { WeekView } from "./level.js";
import type { Data, Forecast } from "./model.js";
import { fmt, hm } from "./time.js";

const f1 = (x: number) => x.toFixed(1);

/** A painted river gauge staff with the wave band and the current water level. */
export function gaugeStaff(level: number | null, falling: boolean): string {
  const top = 7.0, bottom = 3.5, H = 420, W = 150, x0 = 46, sw = 34;
  const y = (m: number) => 12 + (top - m) / (top - bottom) * (H - 24);
  let ticks = "";
  for (let cm = Math.round(bottom * 100); cm <= top * 100; cm += 5) {
    const m = cm / 100, yy = y(m);
    if (cm % 10 === 0) ticks += `<rect x="${x0}" y="${f1(yy)}" width="${cm % 50 === 0 ? sw : sw * 0.55}" height="${f1((H - 24) / ((top - bottom) * 20))}" fill="#000"/>`;
    if (cm % 50 === 0) ticks += `<text x="${x0 - 8}" y="${f1(yy + 5)}" text-anchor="end" class="staff-num">${m.toFixed(1)}</text>`;
  }
  const band = `<rect x="${x0 + sw + 6}" y="${f1(y(UPPER))}" width="7" height="${f1(y(LOWER) - y(UPPER))}" fill="var(--loire)"/>
    <text x="${x0 + sw + 18}" y="${f1(y(UPPER) + 5)}" class="staff-band">${UPPER.toFixed(2)}</text>
    <text x="${x0 + sw + 18}" y="${f1(y(LOWER) + 5)}" class="staff-band">${LOWER.toFixed(2)}</text>
    <text x="${x0 + sw + 18}" y="${f1((y(UPPER) + y(LOWER)) / 2 + 5)}" class="staff-wave">wave</text>`;
  let water = "";
  if (level !== null && Number.isFinite(level)) {
    const yl = Math.max(4, Math.min(H - 4, y(level)));
    water = `<rect x="0" y="${f1(yl)}" width="${W}" height="${f1(H - yl)}" fill="var(--loire)" opacity="0.28"/>
      <path d="M0 ${f1(yl)} q 9 -4 18 0 t 18 0 t 18 0 t 18 0 t 18 0 t 18 0 t 18 0 t 18 0 t 18 0" fill="none" stroke="var(--loire)" stroke-width="2"/>
      <text x="${W - 4}" y="${f1(yl - 8)}" text-anchor="end" class="staff-level">${level.toFixed(2)} m ${falling ? "↓" : "↑"}</text>`;
  }
  return `<svg class="staff" viewBox="0 0 ${W} ${H}" role="img" aria-label="River level ${level?.toFixed(2) ?? "unknown"} m on the Mauves gauge; the wave works between ${LOWER} and ${UPPER} m">
    <rect x="${x0}" y="12" width="${sw}" height="${H - 24}" fill="var(--staff)"/>${ticks}${band}${water}</svg>`;
}

/** Level at Mauves over the last day and a half, with the coming wave windows. */
export function levelChart(f: Forecast, d: Data): string {
  const W = 960, H = 300, L = 48, R = 12, T = 14, B = 34, now = Date.now();
  const t0 = now - 36 * HOUR, t1 = now + 3 * DAY;
  const pts: [number, number][] = [];
  const [i0, i1] = d.H.range(t0, now);
  for (let i = i0; i <= i1; i += 2) if (!Number.isNaN(d.H.v[i])) pts.push([d.H.time(i), d.H.v[i]]);
  const rows = f.rows.filter((r) => r.tmin > t0 && r.tmin < t1);
  const vals = [...pts.map((p) => p[1]), ...rows.map((r) => r.hmin), UPPER, LOWER];
  const lo = Math.floor(Math.min(...vals) * 2) / 2 - 0.25, hi = Math.ceil(Math.max(...vals) * 2) / 2 + 0.25;
  const x = (t: number) => L + (t - t0) / (t1 - t0) * (W - L - R);
  const y = (m: number) => T + (hi - m) / (hi - lo) * (H - T - B);
  let g = `<rect x="${L}" y="${f1(y(UPPER))}" width="${W - L - R}" height="${f1(y(LOWER) - y(UPPER))}" fill="var(--staff)" opacity="0.28"/>`;
  for (let m = Math.ceil(lo * 2) / 2; m <= hi; m += 0.5) g += `<line x1="${L}" x2="${W - R}" y1="${f1(y(m))}" y2="${f1(y(m))}" class="grid"/><text x="${L - 6}" y="${f1(y(m) + 4)}" text-anchor="end" class="axis">${m.toFixed(1)}</text>`;
  for (let t = Math.ceil(t0 / DAY) * DAY; t < t1; t += DAY) {
    g += `<line x1="${f1(x(t))}" x2="${f1(x(t))}" y1="${T}" y2="${H - B}" class="grid"/><text x="${f1(x(t) + 4)}" y="${H - B + 16}" class="axis">${fmt(t, "ccc d")}</text>`;
  }
  for (const r of rows) {
    if (r.window) g += `<rect x="${f1(x(r.window[0]))}" y="${f1(y(UPPER))}" width="${f1(Math.max(2, x(r.window[1]) - x(r.window[0])))}" height="${f1(y(LOWER) - y(UPPER))}" fill="var(--staff)"/>`;
    if (r.status === "forecast") {
      const s = f.model.rmseHmin;
      g += `<line x1="${f1(x(r.tmin))}" x2="${f1(x(r.tmin))}" y1="${f1(y(r.hmin + s))}" y2="${f1(y(r.hmin - s))}" class="err"/><circle cx="${f1(x(r.tmin))}" cy="${f1(y(r.hmin))}" r="4" class="low"/>`;
    }
  }
  if (pts.length) g += `<polyline points="${pts.map((p) => `${f1(x(p[0]))},${f1(y(p[1]))}`).join(" ")}" class="obs"/>`;
  g += `<line x1="${f1(x(now))}" x2="${f1(x(now))}" y1="${T}" y2="${H - B}" class="now"/><text x="${f1(x(now) + 4)}" y="${T + 10}" class="axis">now ${hm(now)}</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Mauves level, last 36 hours and forecast lows for 3 days">${g}</svg>`;
}

/** Local midnights from a to b. */
function midnights(a: number, b: number): number[] {
  const out: number[] = [];
  for (let d = DateTime.fromMillis(a, { zone: TZ }).startOf("day"); d.toMillis() <= b; d = d.plus({ days: 1 })) if (d.toMillis() >= a) out.push(d.toMillis());
  return out;
}

const path = (pts: [number, number][]) => {
  let s = "", pen = false;
  for (const [x, y] of pts) {
    if (!Number.isFinite(y)) { pen = false; continue; }
    s += `${pen ? "L" : "M"}${f1(x)} ${f1(y)}`; pen = true;
  }
  return s;
};

/** A simulated week against the gauge: level chart and, below it, the Montjean flow (assumed and real).
 *  Geometry is shared with the hover script through data attributes. */
export function simulationCharts(v: WeekView, withRealFlow = true): string {
  const W = 960, L = 52, R = 14, T = 14, H = 330, B = 30, FH = 150, FB = 30;
  const x = (t: number) => L + (t - v.t0) / (v.t1 - v.t0) * (W - L - R);
  const vals = v.points.flatMap((p) => withRealFlow ? [p.real, p.sim, p.simReal] : [p.real, p.sim]).filter(Number.isFinite);
  const lo = Math.floor(Math.min(...vals, LOWER) * 2) / 2 - 0.25, hi = Math.ceil(Math.max(...vals, UPPER) * 2) / 2 + 0.25;
  const y = (m: number) => T + (hi - m) / (hi - lo) * (H - T - B);
  const days = midnights(v.t0, v.t1);
  const gridX = (bottom: number, top: number, labels: boolean) => days.map((t) => `<line x1="${f1(x(t))}" x2="${f1(x(t))}" y1="${top}" y2="${bottom}" class="grid"/>` +
    (labels && t < v.t1 ? `<text x="${f1(x(t) + 4)}" y="${bottom + 18}" class="axis">${fmt(t, "ccc d")}</text>` : "")).join("");
  const now = v.now > v.t0 && v.now < v.t1 ? v.now : null;

  let g = `<rect x="${L}" y="${f1(y(UPPER))}" width="${W - L - R}" height="${f1(y(LOWER) - y(UPPER))}" fill="var(--staff)" opacity="0.28"/>`;
  const step = hi - lo > 4 ? 1 : 0.5;
  for (let m = Math.ceil(lo / step) * step; m <= hi; m += step) g += `<line x1="${L}" x2="${W - R}" y1="${f1(y(m))}" y2="${f1(y(m))}" class="grid"/><text x="${L - 6}" y="${f1(y(m) + 4)}" text-anchor="end" class="axis">${m.toFixed(1)}</text>`;
  g += gridX(H - B, T, true);
  const band = (w: [number, number], y0: number, h: number, cls: string) =>
    `<rect x="${f1(x(Math.max(v.t0, w[0])))}" y="${f1(y0)}" width="${f1(Math.max(2, x(Math.min(v.t1, w[1])) - x(Math.max(v.t0, w[0]))))}" height="${f1(h)}" class="${cls}"/>`;
  const bandH = y(LOWER) - y(UPPER);
  for (const l of v.lows) {
    if (l.simWindow) g += band(l.simWindow, y(UPPER), bandH, "win-sim");
    if (l.obsWindow) g += band(l.obsWindow, y(LOWER) - 5, 5, "win-obs");
  }
  if (withRealFlow) g += `<path d="${path(v.points.map((p) => [x(p.t), y(p.simReal)]))}" class="sim-real"/>`;
  g += `<path d="${path(v.points.map((p) => [x(p.t), y(p.real)]))}" class="obs"/>`;
  g += `<path d="${path(v.points.map((p) => [x(p.t), y(p.sim)]))}" class="sim"/>`;
  if (now) g += `<line x1="${f1(x(now))}" x2="${f1(x(now))}" y1="${T}" y2="${H - B}" class="now"/><text x="${f1(x(now) + 4)}" y="${T + 10}" class="axis">now</text>`;
  g += `<text x="${W - R - 4}" y="${f1(y(UPPER) - 5)}" text-anchor="end" class="axis">wave band ${LOWER}–${UPPER} m</text>`;

  const qs = v.points.flatMap((p) => [p.qAssumed, p.qReal]).filter(Number.isFinite);
  const qhi = niceMax(Math.max(...qs, 1)), fy = (q: number) => T + (1 - q / qhi) * (FH - T - FB);
  let fg = "";
  for (let k = 0; k <= 4; k++) { const q = qhi * k / 4; fg += `<line x1="${L}" x2="${W - R}" y1="${f1(fy(q))}" y2="${f1(fy(q))}" class="grid"/><text x="${L - 6}" y="${f1(fy(q) + 4)}" text-anchor="end" class="axis">${q.toFixed(0)}</text>`; }
  fg += gridX(FH - FB, T, true);
  fg += `<path d="${path(v.points.map((p) => [x(p.t), fy(p.qReal)]))}" class="obs"/>`;
  fg += `<path d="${path(v.points.map((p) => [x(p.t), fy(p.qAssumed)]))}" class="sim"/>`;
  if (now) fg += `<line x1="${f1(x(now))}" x2="${f1(x(now))}" y1="${T}" y2="${FH - FB}" class="now"/>`;

  const cross = `<line class="cross" x1="0" x2="0" y1="${T}" y2="${H - B}" visibility="hidden"/>`;
  return `<div class="simchart" data-l="${L}" data-r="${R}" data-w="${W}">
    <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Mauves level from ${fmt(v.t0, "d LLL yyyy")}: real, simulated from the start of the week${withRealFlow ? ", and simulated with the real flow" : ""}">${g}${cross}</svg>
    <p class="note" style="margin:14px 0 4px">Montjean flow (m³/s), shifted by the travel time to Mauves</p>
    <svg class="chart flowchart" viewBox="0 0 ${W} ${FH}" role="img" aria-label="Montjean flow assumed by the simulation and the real flow">${fg}</svg>
    <div class="tip" hidden></div></div>`;
}

function niceMax(v: number): number {
  const p = 10 ** Math.floor(Math.log10(v)), m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}
