import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./config.js";

/** Time series: epoch ms and values (heights in m, flows in m3/s). */
export interface Series { t: number[]; v: number[] }
export interface Session { start: number; end: number; note: string }

const cache = new Map<string, unknown>();
let version = 0;
/** Increases every time something is written; used to invalidate derived caches. */
export const dataVersion = () => version;

function file(name: string) { return path.join(DATA_DIR, name); }

function readJson<T>(name: string, fallback: T): T {
  if (cache.has(name)) return cache.get(name) as T;
  let value = fallback;
  try { value = JSON.parse(fs.readFileSync(file(name), "utf8")) as T; } catch { /* missing */ }
  cache.set(name, value);
  return value;
}

function writeJson(name: string, value: unknown) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = file(name + ".tmp");
  fs.writeFileSync(tmp, JSON.stringify(value));
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

export const loadSessions = () => readJson<Session[]>("sessions.json", []);
export function saveSessions(s: Session[]) {
  writeJson("sessions.json", [...s].sort((a, b) => a.start - b.start));
}

/** Files already read from MAREGRAPHIE_DIR: name -> "size:mtime". */
export const loadImported = () => readJson<Record<string, string>>("imported_files.json", {});
export const saveImported = (x: Record<string, string>) => writeJson("imported_files.json", x);

export const loadModel = <T>() => readJson<T | null>("model.json", null);
export const saveModel = (m: unknown) => writeJson("model.json", m);
