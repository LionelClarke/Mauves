/** Background work: downloads and model fitting, one job at a time, with a visible log. */
import { DAY, HISTORY_YEARS, HOUR, OFFLINE, UPDATE_EVERY_MIN } from "./config.js";
import { downloadHistory, STATIONS, updateStation } from "./fetchers.js";
import { tideFits } from "./almanac.js";
import { importGaugeFiles } from "./maregraphie.js";
import { calibrate, isCurrent, NO_TIDE, type Model } from "./model.js";
import { dataVersion, loadModel, loadSeries } from "./store.js";

export const jobState = { running: null as string | null, log: [] as { t: number; msg: string }[], lastError: null as string | null };

export function log(msg: string) {
  jobState.log.push({ t: Date.now(), msg });
  if (jobState.log.length > 300) jobState.log.shift();
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

export async function runJob(name: string, fn: () => Promise<void>): Promise<boolean> {
  if (jobState.running) return false;
  jobState.running = name;
  jobState.lastError = null;
  log(`${name}: started`);
  try { await fn(); log(`${name}: done`); }
  catch (e) { jobState.lastError = `${name}: ${(e as Error).message}`; log(jobState.lastError); }
  finally { jobState.running = null; }
  return true;
}

export async function refit(): Promise<void> {
  const m = calibrate();
  log(`Model fitted on ${m.nEvents} low tides; ` +
    `level error ±${(m.rmseHmin * 100).toFixed(0)} cm, wave start ±${m.validation.startRmseMin?.toFixed(0) ?? "?"} min`);
}

/** Refit if the data changed since the last fit and the model is older than `maxAgeH`. */
export async function refitIfStale(maxAgeH = 6): Promise<void> {
  const m = loadModel<Model>();
  if (isCurrent(m) && (m.dataVersion === dataVersion() || Date.now() - m.created < maxAgeH * HOUR)) return;
  if (loadSeries("stnazaire_H").t.length < 2) {
    log(NO_TIDE);
    return;
  }
  await refit();
}

/** Reads new gauge files (placed by hand), refits if Saint-Nazaire changed, and fits the tides
 *  for the tide calendar so its page opens quickly. */
export const importJob = () => runJob("Read tide gauge files", async () => {
  if (importGaugeFiles(log).includes("stnazaire_H")) await refitIfStale(0);
  tideFits();
});

export const updateJob = () => runJob("Update gauges", async () => {
  for (const st of STATIONS) await updateStation(st, log);
  importGaugeFiles(log);
  await refitIfStale();
  tideFits();
});

export const historyJob = (years: number) => runJob(`Download ${years} years of history`, async () => {
  await downloadHistory(years, log);
  await refit().catch((e) => log(`Model not fitted yet: ${(e as Error).message}`));
});

export const refitJob = () => runJob("Fit model", refit);

export function startScheduler() {
  if (OFFLINE) {
    log("OFFLINE=1: no downloads.");
    importJob().then(() => runJob("Fit model", () => refitIfStale(0)));
    return;
  }
  const boot = async () => {
    await importJob();
    const h = loadSeries("mauves_H");
    const span = h.t.length ? h.t[h.t.length - 1] - h.t[0] : 0;
    if (span < 60 * DAY) {
      log(`First start: downloading ${HISTORY_YEARS} years of gauge history (a few minutes, done once).`);
      await historyJob(HISTORY_YEARS);
    }
    await updateJob();
  };
  boot();
  setInterval(() => { updateJob(); }, UPDATE_EVERY_MIN * 60_000);
}
