import path from "node:path";

/** Wave band at the Mauves-sur-Loire gauge (m). The wave works on the falling tide only,
 *  from UPPER down to LOWER (or until the low if the level doesn't get that far). */
export const UPPER = Number(process.env.WAVE_UPPER ?? 5.25);
export const LOWER = Number(process.env.WAVE_LOWER ?? 4.75);
export const BAND_MID = (UPPER + LOWER) / 2;

export const MAUVES = "M622001010";     // Loire at Mauves-sur-Loire (tidal)
export const MONTJEAN = "M530001010";   // Loire at Montjean-sur-Loire (non tidal)
export const TZ = "Europe/Paris";

export const DATA_DIR = path.resolve(process.env.DATA_DIR ?? "data");
/** Recorded sessions live in the project folder, not DATA_DIR, so they are kept in git. */
export const SESSIONS_FILE = path.resolve(process.env.SESSIONS_FILE ?? "sessions.json");
export const PORT = Number(process.env.PORT ?? 3000);
/** OFFLINE=1 disables all downloads (useful for development and tests). */
export const OFFLINE = process.env.OFFLINE === "1";
export const HISTORY_YEARS = Number(process.env.HISTORY_YEARS ?? 2);
export const UPDATE_EVERY_MIN = Number(process.env.UPDATE_EVERY_MIN ?? 30);

/** SHOM tide gauge files (REFMAR JSON), placed there by hand. Saint-Nazaire is station 37, Brest 3. */
export const MAREGRAPHIE_DIR = path.resolve(process.env.MAREGRAPHIE_DIR ?? "maregraphie");
export const SN_SHOM_ID = 37;
/** Brest (station 3) is the reference port for French tidal coefficients. */
export const BREST_SHOM_ID = 3;

export const QLAG_CANDIDATES = [0, 6, 12, 18, 24, 36, 48];   // Montjean -> Mauves travel time tried (h)
export const MIN_EVENTS = 15;
/** Falling-tide curve at Mauves, sampled from CURVE_FROM to CURVE_TO after Saint-Nazaire high water
 *  (the Mauves low comes 10 to 12 h after it). */
export const CURVE_STEP_MIN = 10;
export const CURVE_FROM_H = -1;
export const CURVE_TO_H = 14;
/** The curve is fitted locally in ln(flow): past tides weighted by a Gaussian of this width,
 *  at nodes this far apart (a width of 0.2 is about ±20 % in flow). */
export const FLOW_BW = 0.2;
export const FLOW_NODE_STEP = 0.1;

export const MIN = 60_000;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;
