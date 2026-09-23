# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Mauves wave forecast

Node + TypeScript website forecasting the static river wave on the Loire at
Mauves-sur-Loire (France). Owner: Lionel. Language of the UI: English.

## The physics, as observed

- The wave works **on the falling tide only**, while the Mauves gauge (M622001010) is
  between **5.25 m and 4.75 m**. It starts when the falling level passes 5.25 m. It stops
  at 4.75 m, or at the low if the level doesn't get that deep. It never works on the
  rising tide.
- Confirmed on 29 Aug 2026: gauge 5.25 m (falling) at 11:35, 4.74 m at 13:30. The low was
  4.17 m at 17:15, 4 h 36 min after the Saint-Nazaire low water (12:39). Coefficient 97,
  Montjean about 120 m3/s.
- The level of the low depends on the tidal coefficient and on the Loire discharge
  upstream (Montjean, M530001010, travel time about a day).

## Data sources and rules

- Gauge data: Hub'Eau API (official, last month) and the HydroPortail series route
  (`/stationhydro/ajax/<code>/series`, not an official API, paced politely), in `src/fetchers.ts`.
- Saint-Nazaire tide: SHOM REFMAR gauge files (`maregraphie/37_<year>.json`, UTC, m above chart
  datum), **downloaded by hand** by the user and read by `src/maregraphie.ts` into the `stnazaire_H`
  series (10-min, validated source preferred). Brest (`3_*`) goes into `brest_H`, used only for the
  tidal coefficients on the tide calendar. Changed files are re-read at start and every 30 min.
- Tides: **maree.info pages copied by hand** by the user and pasted in the web UI.
  maree.info's terms of use forbid automated downloading. **Never add code that fetches
  maree.info or any other tide site.** Parsers are in `src/tides.ts`. (`MAREE_*` URLs in
  `config.ts` are only shown as links for the user to open.)
  - Calendar pages (`/117/calendrier?d=YYYYMM`) give daily coefficients.
  - The weekly table (`/117`) gives exact Saint-Nazaire high/low times and heights.
  - With the gauge record loaded these pages are optional: tables stand in for the tide when
    there is no gauge record, and coefficients are only displayed.

## Code map

- `src/config.ts` constants (band via WAVE_UPPER / WAVE_LOWER env vars)
- `src/store.ts` JSON files in DATA_DIR (/data in Docker, `./data` otherwise)
- `src/time.ts` Europe/Paris wall-clock helpers (luxon); all stored times are epoch ms
- `src/maregraphie.ts` SHOM gauge file import; `src/harmonic.ts` tide harmonic fit, prediction, ebbs
- `src/almanac.ts` tide calendar (`/calendar`): a month of Saint-Nazaire high/low waters from the harmonic fit, and
  coefficients from the semi-diurnal envelope of a Brest fit (2 × amplitude / 6.10 m × 100). Checked against 54
  maree.info coefficients (Sep 2026): ±1.4 points RMS, worst 3. Fits are cached per series object, warmed by the jobs.
- `src/series.ts` regular grids, rolling min / mean
- `src/linalg.ts` weighted least squares, cross-validation
- `src/model.ts` low detection, calibration, forecast, session checks
- `src/level.ts` week simulation (`/simulate`): the continuous Mauves level from the Saint-Nazaire tide and the flow
  (see below); `src/backtest.ts` scores it on every week of the record (`npm run backtest`, `VARIANTS` env to compare options)
- `src/jobs.ts` background downloads and refits (every 30 min)
- `src/chart.ts` SVG gauge staff and week charts (level, Montjean flow); `src/views.ts` HTML pages; `src/server.ts` Express routes
- `old/` the earlier Python prototype (`vague_mauves.py`), kept for reference only; not used.
- `maregraphie/` SHOM tide-gauge files (SensorML `.sml` + yearly JSON, ~50 MB each, stored with Git LFS; `git-lfs` is not installed in the Claude container, so
  don't `git add` them from there). Don't `cat`
  the JSON files whole.

## How the pieces fit

- **Store and caches.** `store.ts` caches every JSON file in memory after the first read
  and bumps `dataVersion()` on every write. `getData()` in `model.ts` rebuilds its grids
  only when that version changes. Files edited on disk are not seen until the server restarts.
- **Model staleness.** `model.json` is reused until the data changes. A saved model is used only
  if its `format` equals `MODEL_FORMAT` in `model.ts`: bump it whenever `Model` changes shape.
  A refit (harmonic fit + curves + cross-validation) takes a few seconds and blocks the server.
- **Jobs.** `runJob` runs one job at a time (`jobState.running`); the others are refused, not
  queued. Pasting tide pages triggers a refit; the scheduler downloads history on first
  start (< 60 days of data), then updates every `UPDATE_EVERY_MIN`.
- **Pages.** Server-rendered HTML strings in `views.ts`. POST handlers redirect (303) with a
  one-shot banner kept in an in-memory `flash` map (`?m=<key>`).
- `GET /api/forecast?days=7&flow=250` returns the forecast as JSON; `GET /api/simulate?start=YYYY-MM-DD` the week
  simulation; `GET /healthz`.

## Model in one paragraph

The Saint-Nazaire tide is a harmonic fit (up to 50 constituents, Rayleigh-selected, no nodal
corrections, last 3 years) of the gauge record; it gives every ebb, past and future, as
high-water time and height, low-water height and mid-ebb time (`Ebb`). Training uses these
predicted ebbs too, not the observed ones, so training and forecast see the same tide (this
tested better). Lows are found directly in the Mauves record and paired with the ebb whose low
water is 0.5–9 h before. The Mauves level every 10 min from −1 h to +14 h after the Saint-Nazaire
high water is regressed on [1, lnQ, hw, lw, mid-ebb delay], weighted locally in ln(flow)
(Gaussian, width `FLOW_BW`), at nodes `FLOW_NODE_STEP` apart, interpolated between nodes.
The wave window and the low are both read off the predicted curve. The Montjean lag is chosen by
cross-validating a global polynomial for the level of the low. Validation predicts each block
of months from a fit without it. The forecast shifts the curve by the mean error of the last 4
lows (capped at ±0.3 m), fading over about 2 days. Measured on Jun–Sep 2026 held out: wave start
and end about ±17 min at summer flows; errors are larger at high flow, where lows are flat.

## Week simulation

`level.ts` fits the falling-curve regression of `model.ts` (`fitCurve`/`curveAt`, local in ln(flow)) on **every** Saint-Nazaire
tide (floods included, no low detection), with the next high water as an extra feature, and crossfades consecutive curves
(−1 h to +14 h, 2 h ramps) into one series every 10 min. A week is simulated from what was known at local midnight on its
first day: the Montjean flow until then (Q taken 6 h before mid-curve), extended at its 3-day ln-trend (falls damped over
3 days, rises above 5 %/day over 1 day), and the mean error of the day before (capped ±0.5 m, fading over 96 h). Weeks inside
the record use a fit leaving out their 4-week block (6 folds, `foldOf`). Fits and ebbs are cached in memory per `dataVersion()`,
and so is the page's backtest summary (~1–2 s on first view). Options live in `SIM_DEFAULTS`.
Backtest, 103 weeks (Sep 2024–Sep 2026): level ±33 cm from the start of the week (day 1 ±21, day 4 ±29, day 7 ±48; flow
< 300 m³/s ±13 cm), ±16 cm with the real flow; lows ±33 cm (±11 cm with real flow); wave start/end ±44/±40 min (±26/±25
with real flow); wave or not right 92 %. Most error is the unknown future flow; floods above the fitted range are under-predicted.

## Commands

- `npm run build` then `npm start` (port 3000). `npm run dev` does both.
- `OFFLINE=1` disables downloads (gauge files in `maregraphie/` are still read). For a local run against a copy of the data:
  `OFFLINE=1 DATA_DIR=./data PORT=3001 npm run dev`.
- In Docker, Claude Code runs in its own container (`claude` service, `Dockerfile.claude`, `./build.sh` then
  `./claude.sh`), with the website's data read-only at `/data` and the site at http://wave:3000. The site runs
  `npm run watch` (`tsc --watch` + `node --watch`), so it recompiles and restarts by itself when `src/` changes; a
  compile error leaves the last good build running. Changes to `docker-compose.yml` or `package.json` need
  `docker compose up -d wave` on the host.
  After adding npm packages: `docker compose up -d --build -V` and `./build.sh`.
- Check changes with `npx tsc --noEmit` (the site picks up edits as soon as they compile). There are no tests and no linter;
  `tsc` is the only check.
- ESM with `NodeNext` resolution: relative imports must end in `.js` (e.g. `./config.js`).

## Style

Design: limestone background, river-slate text, the yellow gauge staff is the one bold
element. Plain, specific copy in sentence case. Keep pages server-rendered.
