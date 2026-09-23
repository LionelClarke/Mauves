import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, SESSIONS_FILE } from "./config.js";

/** Time series: epoch ms and values (heights in m, flows in m3/s). */
export interface Series { t: number[]; v: number[] }
/** A session seen on the river; end is null when only the start was noted. */
export interface Session { start: number; end: number | null; note: string }

const cache = new Map<string, unknown>();
let version = 0;
/** Increases every time something is written; used to invalidate derived caches. */
export const dataVersion = () => version;

/** A file in DATA_DIR, or an absolute path as is. */
function file(name: string) { return path.resolve(DATA_DIR, name); }

function readJson<T>(name: string, fallback: T): T {
  if (cache.has(name)) return cache.get(name) as T;
  let value = fallback;
  try { value = JSON.parse(fs.readFileSync(file(name), "utf8")) as T; } catch { /* missing */ }
  cache.set(name, value);
  return value;
}

function writeJson(name: string, value: unknown, pretty = false) {
  fs.mkdirSync(path.dirname(file(name)), { recursive: true });
  const tmp = file(name + ".tmp");
  fs.writeFileSync(tmp, pretty ? JSON.stringify(value, null, 2) + "\n" : JSON.stringify(value));
  fs.renameSync(tmp, file(name));
  cache.set(name, value);
  version++;
}

export const loadSeries = (name: string) => readJson<Series>(`${name}.json`, { t: [], v: [] });

export function mergeSeries(name: string, add: Series): Series {
  const old = loadSeries(name);
  const m = new Map<number, number>();
  old.t.forEach((t, i) => m.set(t, old.v[i]));
  add.t.forEach((t, i) => { if (Number.isFinite(add.v[i])) m.set(t, add.v[i]); });
  const t = [...m.keys()].sort((a, b) => a - b);
  const merged = { t, v: t.map((x) => m.get(x)!) };
  writeJson(`${name}.json`, merged);
  return merged;
}

export function loadSessions(): Session[] {
  // sessions used to be kept in DATA_DIR: move them over the first time
  const old = file("sessions.json");
  if (!cache.has(SESSIONS_FILE) && !fs.existsSync(SESSIONS_FILE) && fs.existsSync(old)) {
    try { saveSessions(JSON.parse(fs.readFileSync(old, "utf8")) as Session[]); } catch { /* unreadable: start empty */ }
  }
  return readJson<Session[]>(SESSIONS_FILE, []);
}
/** Written indented, one field per line, so changes read well in git. */
export function saveSessions(s: Session[]) {
  writeJson(SESSIONS_FILE, [...s].sort((a, b) => a.start - b.start), true);
}

/** Files already read from MAREGRAPHIE_DIR: name -> "size:mtime". */
export const loadImported = () => readJson<Record<string, string>>("imported_files.json", {});
export const saveImported = (x: Record<string, string>) => writeJson("imported_files.json", x);

export const loadModel = <T>() => readJson<T | null>("model.json", null);
export const saveModel = (m: unknown) => writeJson("model.json", m);
