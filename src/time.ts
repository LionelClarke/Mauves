import { DateTime } from "luxon";
import { TZ } from "./config.js";

export const local = (t: number) => DateTime.fromMillis(t, { zone: TZ });
export const fmt = (t: number, pattern: string) => local(t).toFormat(pattern);
export const hm = (t: number) => fmt(t, "HH:mm");
export const dayLabel = (t: number) => fmt(t, "ccc d LLL");

/** Local (Europe/Paris) wall-clock time to epoch ms. */
export function localMs(year: number, month: number, day: number, hour = 0, minute = 0): number {
  return DateTime.fromObject({ year, month, day, hour, minute }, { zone: TZ }).toMillis();
}

export interface YMD { year: number; month: number; day: number }

export function addDays(d: YMD, n: number): YMD {
  const x = DateTime.fromObject(d, { zone: "UTC" }).plus({ days: n });
  return { year: x.year, month: x.month, day: x.day };
}

export const ymdKey = (d: YMD) =>
  `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;

export function parseYmd(s: string): YMD {
  const [year, month, day] = s.split("-").map(Number);
  return { year, month, day };
}

export const daysInMonth = (year: number, month: number) =>
  DateTime.fromObject({ year, month }, { zone: "UTC" }).daysInMonth ?? 31;
