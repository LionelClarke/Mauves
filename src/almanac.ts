/** Tide calendar for a month: Saint-Nazaire high and low waters and the tidal coefficients, all
 *  predicted from harmonic fits of the SHOM gauge records (no tide site is consulted).
 *  The coefficient is defined at Brest: the range of the semi-diurnal tide divided by the Brest
 *  unit of height (6.10 m, the mean range of equinoctial spring tides), times 100. It is read off
 *  the semi-diurnal envelope of the Brest fit at each Saint-Nazaire high water. */
import { DAY } from "./config.js";
import { extremesFrom, fitTide, semidiurnalAmplitude, tideAt, type Extreme, type TideFit } from "./harmonic.js";
import { loadSeries, type Series } from "./store.js";
import { daysInMonth, localMs } from "./time.js";

const BREST_RANGE_UNIT = 6.1;

/** Fits are kept for as long as the series object is (reading a new file replaces it). */
const fits = new WeakMap<Series, TideFit | null>();
function fitOf(name: string): TideFit | null {
  const s = loadSeries(name);
  if (!fits.has(s)) fits.set(s, fitTide(s));
  return fits.get(s)!;
}
export const tideFits = () => ({ stNazaire: fitOf("stnazaire_H"), brest: fitOf("brest_H") });

export const coefficientAt = (brest: TideFit, t: number) =>
  Math.round(200 * semidiurnalAmplitude(brest, t) / BREST_RANGE_UNIT);

export interface HighWater extends Extreme { coef: number | null }
export interface AlmanacDay { start: number; highs: HighWater[]; lows: Extreme[] }
export interface Almanac { year: number; month: number; days: AlmanacDay[]; stNazaire: TideFit; brest: TideFit | null }

/** The month's tides by local day, or null without a Saint-Nazaire gauge record. */
export function almanac(year: number, month: number): Almanac | null {
  const { stNazaire, brest } = tideFits();
  if (!stNazaire) return null;
  const n = daysInMonth(year, month);
  const starts = Array.from({ length: n + 1 }, (_, i) => i < n ? localMs(year, month, i + 1)
    : month === 12 ? localMs(year + 1, 1, 1) : localMs(year, month + 1, 1));
  const ext = extremesFrom((t) => tideAt(stNazaire, t), starts[0], starts[n]);
  const days: AlmanacDay[] = [];
  for (let d = 0; d < n; d++) {
    const today = ext.filter((x) => x.t >= starts[d] && x.t < starts[d + 1]);
    days.push({
      start: starts[d],
      highs: today.filter((x) => x.high).map((x) => ({ ...x, coef: brest ? coefficientAt(brest, x.t) : null })),
      lows: today.filter((x) => !x.high),
    });
  }
  return { year, month, days, stNazaire, brest };
}

/** How far a month is from the gauge record, in days (0 inside it): predictions drift slowly with
 *  distance, as the fit has no nodal corrections. */
export const daysOutside = (f: TideFit, a: number, b: number) => Math.max(0, f.from - b, a - f.to) / DAY;
