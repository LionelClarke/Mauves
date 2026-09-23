/** HTML pages (server-rendered). */
import { LOWER, UPPER } from "./config.js";
import type { Almanac } from "./almanac.js";
import { gaugeStaff, levelChart, simulationCharts } from "./chart.js";
import type { Score } from "./backtest.js";
import type { WeekView } from "./level.js";
import type { Data, Forecast, ForecastRow, Model, SessionCheck } from "./model.js";
import { dayLabel, fmt, hm, local } from "./time.js";

export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const CSS = `
:root{--stone:#E4E9E3;--paper:#F3F5F1;--ink:#14242C;--loire:#2C5A6B;--silt:#6F8177;--staff:#F2C230;--rule:#C9D1CA;
  --display:"Barlow Condensed","Arial Narrow",sans-serif;--text:"Public Sans",system-ui,-apple-system,"Segoe UI",sans-serif}
@media (prefers-color-scheme:dark){:root{--stone:#101B21;--paper:#16252D;--ink:#E3E9E4;--loire:#6FA6B8;--silt:#93A69A;--rule:#2A3B44}}
*{box-sizing:border-box}
body{margin:0;background:var(--stone);color:var(--ink);font:16px/1.55 var(--text)}
a{color:var(--loire)}
a:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible{outline:3px solid var(--staff);outline-offset:2px}
header{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 28px;padding:18px clamp(16px,4vw,48px);border-bottom:1px solid var(--rule)}
.brand{font:700 1.7rem/1 var(--display);letter-spacing:.01em;text-decoration:none;color:var(--ink)}
nav{display:flex;gap:20px;flex-wrap:wrap}
nav a{text-decoration:none;color:var(--silt);font-weight:600}
nav a[aria-current]{color:var(--ink);box-shadow:inset 0 -3px var(--staff)}
main{max-width:1060px;padding:24px clamp(16px,4vw,48px) 64px}
h1,h2{font-family:var(--display);font-weight:700;line-height:1.05;margin:0 0 .4em}
h1{font-size:clamp(2.1rem,5vw,3.2rem)} h2{font-size:1.6rem;margin-top:1.6em}
p{max-width:68ch}
.banner{background:var(--paper);border-left:6px solid var(--staff);padding:10px 14px;margin:0 0 20px}
.banner.error{border-color:#B04632}
.hero{display:grid;grid-template-columns:150px 1fr;gap:clamp(18px,4vw,48px);align-items:center}
.staff{width:150px;height:auto}
.staff-num,.staff-band{font:600 13px var(--text);fill:var(--ink)} .staff-wave{font:700 15px var(--display);fill:var(--loire)}
.staff-level{font:700 17px var(--display);fill:var(--ink)}
.now-line{color:var(--silt);margin:0 0 10px}
.when{font:700 clamp(3rem,9vw,5.6rem)/.92 var(--display);margin:0}
.when small{display:block;font-size:.42em;color:var(--silt);font-weight:600}
.lede{margin:.6em 0 0;font-size:1.08rem}
.chart-wrap{margin-top:28px}.chart{width:100%;min-width:720px;height:auto;background:var(--paper);display:block}
.chart .grid{stroke:var(--rule);stroke-width:1} .chart .axis{font:12px var(--text);fill:var(--silt)}
.chart .obs{fill:none;stroke:var(--loire);stroke-width:2.2} .chart .now{stroke:var(--ink);stroke-dasharray:4 4}
.chart .low{fill:var(--paper);stroke:var(--ink);stroke-width:2} .chart .err{stroke:var(--ink);stroke-width:1.5}
.scroll{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums;margin-top:8px}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--rule);white-space:nowrap}
th{font-weight:600;color:var(--silt);font-size:.9rem}
tr.yes td{background:color-mix(in srgb,var(--staff) 55%,transparent)} tr.maybe td{background:color-mix(in srgb,var(--staff) 22%,transparent)}
tr.obs td{color:var(--silt)}
.win{font:700 1.15rem var(--display)}
.inline{display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin-top:18px}
label{display:flex;flex-direction:column;gap:4px;font-weight:600;font-size:.92rem}
input,textarea{font:inherit;color:var(--ink);background:var(--paper);border:1px solid var(--silt);padding:8px 10px}
textarea{width:100%;min-height:220px;font-size:.9rem}
button{font:700 1.05rem var(--display);letter-spacing:.02em;background:var(--ink);color:var(--stone);border:0;padding:10px 18px;cursor:pointer}
button.quiet{background:transparent;color:var(--ink);border:1px solid var(--ink)}
.note{color:var(--silt);font-size:.92rem}
dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 18px;margin:0}
dt{color:var(--silt)} dd{margin:0}
.check{border-top:1px solid var(--rule);padding:14px 0}
.check h3{font:700 1.3rem var(--display);margin:0 0 6px}
.warn{color:#B04632;font-weight:600}.check form{margin-top:10px}
.stack span{display:block} td.coef{font-weight:600}
tr.today td{background:color-mix(in srgb,var(--staff) 40%,transparent)} tr.weekstart td{border-top:2px solid var(--silt)}
select{font:inherit;color:var(--ink);background:var(--paper);border:1px solid var(--silt);padding:8px 10px}
.months{display:flex;flex-wrap:wrap;gap:10px 24px;align-items:end;margin:8px 0 18px}
.simchart{position:relative;min-width:720px}
.chart .sim{fill:none;stroke:var(--ink);stroke-width:2;stroke-dasharray:7 4} .chart .sim-real{fill:none;stroke:var(--silt);stroke-width:1.5;stroke-dasharray:2 3}
.chart .win-sim{fill:var(--staff)} .chart .win-obs{fill:var(--loire)} .chart .cross{stroke:var(--silt);stroke-width:1}
.legend{display:flex;flex-wrap:wrap;gap:6px 20px;margin:18px 0 6px;font-size:.92rem;color:var(--silt)}
.legend .obs{stroke:var(--loire);stroke-width:2.2} .legend .sim{stroke:var(--ink);stroke-width:2;stroke-dasharray:7 4}
.legend .sim-real{stroke:var(--silt);stroke-width:1.5;stroke-dasharray:2 3} .legend .win-sim{fill:var(--staff)} .legend .win-obs{fill:var(--loire)}
.legend span{display:inline-flex;align-items:center;gap:6px} .legend svg{width:28px;height:10px}
.tip{position:absolute;top:8px;pointer-events:none;background:var(--paper);border:1px solid var(--rule);padding:8px 10px;font-size:.85rem;line-height:1.4;font-variant-numeric:tabular-nums;box-shadow:0 2px 8px rgb(0 0 0/.12)}
.tip b{font-weight:600} .tip div{display:flex;gap:8px;justify-content:space-between}
.log{font-size:.85rem;background:var(--paper);padding:10px 12px;max-height:340px;overflow:auto;white-space:pre-wrap}
@media (max-width:640px){.hero{grid-template-columns:1fr}.staff{width:120px}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}`;

export function layout(title: string, active: string, body: string, banner?: { text: string; error?: boolean }): string {
  const nav = [["/", "Forecast"], ["/calendar", "Tide calendar"], ["/simulate", "Simulation"], ["/sessions", "Sessions"], ["/data", "Data"]]
    .map(([h, l]) => `<a href="${h}"${h === active ? ' aria-current="page"' : ""}>${l}</a>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Public+Sans:wght@400;600&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
<header><a class="brand" href="/">Mauves wave</a><nav>${nav}</nav></header>
<main>${banner ? `<div class="banner${banner.error ? " error" : ""}" role="status">${esc(banner.text)}</div>` : ""}${body}</main></body></html>`;
}

const pct = (p: number) => `${Math.round(p * 100)}%`;
const verdict = (p: number) => p >= 0.8 ? "yes" : p >= 0.6 ? "likely" : p >= 0.4 ? "maybe" : p >= 0.15 ? "unlikely" : "no";
const dur = (w: [number, number]) => { const m = Math.round((w[1] - w[0]) / 60000); return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`; };
const win = (w: [number, number] | null) => w ? `${hm(w[0])} to ${hm(w[1])}` : "–";

function rowClass(r: ForecastRow) { return r.status === "observed" ? "obs" : r.prob >= 0.6 ? "yes" : r.prob >= 0.4 ? "maybe" : ""; }

export function forecastPage(f: Forecast, d: Data, sim: WeekView | null, banner?: { text: string; error?: boolean }): string {
  const falling = (f.now?.trend ?? 0) < -0.005;
  const inBand = f.now && f.now.h < UPPER && f.now.h >= LOWER && falling;
  const nowLine = f.now ? `Now ${f.now.h.toFixed(2)} m and ${falling ? "falling" : f.now.trend > 0.005 ? "rising" : "steady"} at ${hm(f.now.t)}. ${inBand ? "The wave is working." : "No wave right now."}` : "No gauge reading yet.";
  const next = f.rows.find((r) => r.status === "forecast" && r.window && r.prob >= 0.4 && r.window[1] > Date.now());
  let hero: string;
  if (next && next.window) {
    hero = `<p class="when">${esc(dayLabel(next.window[0]))}<small>${win(next.window)}</small></p>
      <p class="lede">${pct(next.prob)} chance. Starts when the falling Loire reaches ${UPPER} m${next.endsTooLow ? `, stops at ${LOWER} m` : ", lasts until the low"}; about ${dur(next.window)}.</p>
`;
  } else {
    const best = f.rows.filter((r) => r.status === "forecast").sort((a, b) => a.hmin - b.hmin)[0];
    hero = `<p class="when">No wave<small>in the next 7 days</small></p>
      <p class="lede">${best ? `Lowest predicted level ${best.hmin.toFixed(2)} m on ${esc(dayLabel(best.tmin))}; the wave needs the falling Loire to pass ${UPPER} m.` : "No low tides to forecast yet."}</p>`;
  }
  const rows = f.rows.map((r) => `<tr class="${rowClass(r)}"><td>${esc(dayLabel(r.tmin))}</td><td class="win">${win(r.window)}</td>
    <td>${r.status === "observed" ? (r.window ? "observed" : "none (observed)") : `${pct(r.prob)} ${verdict(r.prob)}`}</td>
    <td>${r.hmin.toFixed(2)} m</td><td>${hm(r.tmin)}</td>
    <td>${r.coef !== null ? r.coef.toFixed(0) : "–"}</td><td>${hm(r.snLow)}</td><td>${r.q.toFixed(0)}</td></tr>`).join("");
  const m = f.model, v = m.validation;
  return layout("Mauves wave forecast", "/", `
  <section class="hero">${gaugeStaff(f.now?.h ?? null, falling)}<div>
    <p class="now-line">${esc(nowLine)}</p>${hero}
    <form class="inline" method="get" action="/"><label>Montjean flow for the forecast (m³/s)
      <input name="flow" type="number" min="20" max="8000" step="1" value="${f.flowGiven ? f.qUsed.toFixed(0) : ""}" placeholder="${Number.isFinite(f.qNow) ? f.qNow.toFixed(0) : ""} now"></label>
      <button type="submit">Recalculate</button>${f.flowGiven ? ` <a href="/">Use current flow</a>` : ""}</form>
    ${f.extrapolated ? `<p class="warn">This flow is outside the range seen in calibration (${m.qRange[0].toFixed(0)}–${m.qRange[1].toFixed(0)} m³/s), so the forecast is extrapolated.</p>` : ""}
  </div></section>
  <div class="scroll chart-wrap">${levelChart(f, d)}</div>
  <h2>Coming low tides</h2>
  <div class="scroll"><table><thead><tr><th>Day</th><th>Wave</th><th>Chance</th><th>Min. level</th><th>Low at Mauves</th><th>Coef.</th><th>Low water St-Nazaire</th><th>Flow used (m³/s)</th></tr></thead>
  <tbody>${rows}</tbody></table></div>
  ${sim ? `<h2>Level for the week</h2>
  <p>The level at Mauves from midnight today, simulated from the Saint-Nazaire tide, the Montjean flow and its trend, and the
  level yesterday. It follows every tide, rising and falling; the wave times in the table above come from the falling-tide model, which is more precise.
  Its error grows through the week, mostly from not knowing the flow to come: see <a href="/simulate">Simulation</a> for how it did on past weeks.</p>
  ${simulationBlock(sim, false)}` : ""}
  <p class="note">The wave works on the falling tide only, while the Mauves gauge is between ${UPPER} and ${LOWER} m. Times are local.
  Model: ${m.nEvents} past low tides; minimum level ±${(m.rmseHmin * 100).toFixed(0)} cm,
  time of the low ±${Math.round(m.rmseLowMin)} min${v.startRmseMin !== null ? `, wave start ±${v.startRmseMin.toFixed(0)} min, end ±${v.endRmseMin!.toFixed(0)} min` : ""}.
  Saint-Nazaire tides predicted from its gauge record; future flow is assumed constant${Math.abs(f.bias) >= 0.01 ? `; recent lows ran ${(f.bias * 100).toFixed(0)} cm off the model, which is corrected for` : ""}.</p>`, banner);
}

export function emptyPage(problem: string, banner?: { text: string; error?: boolean }): string {
  return layout("Mauves wave forecast", "/", `<h1>No forecast yet</h1><p>${esc(problem)}</p>
  <p>The forecast needs two things: the gauge history, which downloads by itself (see <a href="/data">Data</a>), and the
  Saint-Nazaire tide: the SHOM gauge files (<code>37_&lt;year&gt;.json</code>) in the <code>maregraphie</code> folder.</p>`, banner);
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ym = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;

/** Saint-Nazaire high and low waters and the coefficients for one month. */
export function calendarPage(year: number, month: number, al: Almanac | null, offsetDays: number): string {
  const prev = month === 1 ? [year - 1, 12] : [year, month - 1], next = month === 12 ? [year + 1, 1] : [year, month + 1];
  const now = local(Date.now()), isNow = year === now.year && month === now.month;
  const picker = `<div class="months"><a href="/calendar?month=${ym(prev[0], prev[1])}">← ${MONTHS[prev[1] - 1]}</a>
    <form class="inline" style="margin:0" method="get" action="/calendar">
      <label>Month<select name="mon">${MONTHS.map((m, i) => `<option value="${i + 1}"${i + 1 === month ? " selected" : ""}>${m}</option>`).join("")}</select></label>
      <label>Year<input name="year" type="number" min="2000" max="2100" value="${year}" style="width:6.5em"></label>
      <button type="submit">Show</button></form>
    <a href="/calendar?month=${ym(next[0], next[1])}">${MONTHS[next[1] - 1]} →</a>${isNow ? "" : ` <a href="/calendar">This month</a>`}</div>`;
  const head = `<h1>Tide calendar</h1><h2 style="margin-top:0">${MONTHS[month - 1]} ${year}</h2>${picker}`;
  if (!al) return layout("Tide calendar", "/calendar", `${head}<p>No Saint-Nazaire gauge record yet. Put the SHOM gauge files
    (<code>37_&lt;year&gt;.json</code>, and <code>3_&lt;year&gt;.json</code> for Brest) in the <code>maregraphie</code> folder; they are read at start and every 30 minutes.</p>`);
  const today = fmt(Date.now(), "yyyy-LL-dd");
  const stack = (xs: string[]) => xs.length ? `<span>${xs.join("</span><span>")}</span>` : "–";
  const rows = al.days.map((d) => `<tr class="${fmt(d.start, "yyyy-LL-dd") === today ? "today" : ""}${fmt(d.start, "c") === "1" && d.start !== al.days[0].start ? " weekstart" : ""}">
    <td>${esc(fmt(d.start, "ccc d"))}</td>
    <td class="coef stack">${al.brest ? stack(d.highs.map((h) => String(h.coef))) : "–"}</td>
    <td class="stack">${stack(d.highs.map((h) => `${hm(h.t)} &nbsp;${h.h.toFixed(2)} m`))}</td>
    <td class="stack">${stack(d.lows.map((l) => `${hm(l.t)} &nbsp;${l.h.toFixed(2)} m`))}</td></tr>`).join("");
  return layout("Tide calendar", "/calendar", `${head}
  ${offsetDays > 60 ? `<p class="warn">This month is ${offsetDays > 700 ? `about ${Math.round(offsetDays / 365)} years` : `${Math.round(offsetDays)} days`} away from the gauge records, so times and heights may drift by more than usual.</p>` : ""}
  <div class="scroll"><table><thead><tr><th>Day</th><th>Coef.</th><th>High water</th><th>Low water</th></tr></thead>
  <tbody>${rows}</tbody></table></div>
  <p class="note">Saint-Nazaire, times local, heights in metres above chart datum. Predicted from the SHOM gauge records
  (${al.stNazaire.names.length} tidal constituents, fitted ${esc(fmt(al.stNazaire.from, "LLL yyyy"))} to ${esc(fmt(al.stNazaire.to, "LLL yyyy"))}): the astronomical tide only, so wind and pressure can shift the real levels by 10–20 cm or more.
  Times of neap high waters, when the tide is flat at the top, can be off by an hour.
  ${al.brest ? `Coefficients are worked out from the Brest tide, as the official ones are: the range of its semi-diurnal tide over 6.10 m, times 100, given for each high water. They are usually within 2 points of the published tables.` : "No Brest gauge record, so no coefficients: put <code>3_&lt;year&gt;.json</code> files in the <code>maregraphie</code> folder."}</p>`);
}

const trendWord = (x: number) => x < -0.01 ? "falling" : x > 0.01 ? "rising" : "steady";

export function sessionsPage(res: { checks: SessionCheck[]; upper: { value: number; n: number }; lower: { value: number; n: number } }, banner?: { text: string; error?: boolean }): string {
  const items = res.checks.slice().reverse().map((c) => `<div class="check"><h3>${esc(fmt(c.start, "cccc d LLLL yyyy"))}, ${hm(c.start)} to ${hm(c.end)}</h3>
    ${c.note ? `<p>${esc(c.note)}</p>` : ""}
    ${Number.isFinite(c.hStart) ? `<dl><dt>Gauge at start</dt><dd>${c.hStart.toFixed(2)} m, ${trendWord(c.trendStart)}</dd>
    <dt>Gauge at end</dt><dd>${c.hEnd.toFixed(2)} m, ${trendWord(c.trendEnd)}</dd>
    ${c.lows.map((l) => `<dt>Low at Mauves</dt><dd>${hm(l.tmin)}, ${l.hmin.toFixed(2)} m</dd>`).join("")}
    <dt>Gauge in the band</dt><dd>${c.observed.map((w) => win(w)).join(" and ") || "never"}</dd>
    ${c.model ? `<dt>Model</dt><dd>${win(c.model.window)} (${c.model.coef !== null ? `coef. ${c.model.coef.toFixed(0)}, ` : ""}Montjean ${c.model.q.toFixed(0)} m³/s, low ${c.model.hmin.toFixed(2)} m)</dd>
    <dt>Predicted low</dt><dd>${hm(c.model.predictedLow)} (Saint-Nazaire low ${hm(c.model.snLow)})</dd>` : `<dt>Model</dt><dd>needs the Saint-Nazaire tide for that day</dd>`}</dl>
    ${c.outsideBand ? `<p class="warn">The gauge was outside ${LOWER}–${UPPER} m during this session: check the times, or the band needs adjusting.</p>` : ""}
    ${c.trendStart > 0.01 || c.trendEnd > 0.01 ? `<p class="warn">This session touches a rising tide; the wave only works on the falling tide. Check the times.</p>` : ""}`
    : `<p class="note">No gauge data for that time.</p>`}
    <form method="post" action="/sessions/delete"><input type="hidden" name="index" value="${c.index}"><button class="quiet" type="submit">Delete session</button></form></div>`).join("");
  const band = (x: { value: number; n: number }) => x.n ? `${x.value.toFixed(2)} m from ${x.n} session${x.n > 1 ? "s" : ""}` : "no sessions yet";
  return layout("Sessions", "/sessions", `<h1>Sessions</h1>
  <p>Record sessions you saw. Each one is checked against the gauge and the model, and together they show where the wave really starts and stops.</p>
  <form class="inline" method="post" action="/sessions">
    <label>Day<input type="date" name="date" required></label><label>Start<input type="time" name="start" required></label>
    <label>End<input type="time" name="end" required></label><label>Note<input name="note" maxlength="200"></label>
    <button type="submit">Record session</button></form>
  <h2>Where the wave starts and stops</h2>
  <dl><dt>Starts at</dt><dd>${band(res.upper)} (the app uses ${UPPER} m)</dd><dt>Stops at</dt><dd>${band(res.lower)} (the app uses ${LOWER} m)</dd></dl>
  <p class="note">To change the band, set WAVE_UPPER and WAVE_LOWER in the container's environment.</p>
  ${items ? `<h2>Recorded sessions</h2>${items}` : ""}`, banner);
}

export function dataPage(info: { series: { label: string; from: number | null; to: number | null; n: number }[];
  model: Model | null; running: string | null; lastError: string | null; log: { t: number; msg: string }[]; offline: boolean },
  banner?: { text: string; error?: boolean }): string {
  const m = info.model;
  return layout("Data", "/data", `<h1>Data</h1>
  ${info.running ? `<p class="banner" role="status">Working: ${esc(info.running)}. Reload to follow progress.</p>` : ""}
  ${info.lastError ? `<p class="warn">${esc(info.lastError)}</p>` : ""}
  <dl>${info.series.map((s) => `<dt>${esc(s.label)}</dt><dd>${s.n ? `${esc(fmt(s.from!, "d LLL yyyy"))} to ${esc(fmt(s.to!, "d LLL yyyy HH:mm"))} (${s.n.toLocaleString("en")} readings)` : "none yet"}</dd>`).join("")}</dl>
  ${info.offline ? `<p class="note">Downloads are off (OFFLINE=1).</p>` : `<p class="note">Gauge data updates by itself every 30 minutes.</p>`}
  <div class="inline">
    <form method="post" action="/actions/update"><button type="submit">Update gauges now</button></form>
    <form method="post" action="/actions/refit"><button type="submit">Refit model</button></form>
    <form method="post" action="/actions/history" class="inline" style="margin:0"><label>Years<input type="number" name="years" min="0.5" max="20" step="0.5" value="2" style="width:6em"></label><button class="quiet" type="submit">Download history</button></form>
  </div>
  <h2>Model</h2>
  ${m ? `<dl><dt>Fitted</dt><dd>${esc(fmt(m.created, "d LLL yyyy HH:mm"))} on ${m.nEvents} low tides (${esc(fmt(m.period[0], "d LLL yyyy"))} to ${esc(fmt(m.period[1], "d LLL yyyy"))})</dd>
  <dt>Flows seen</dt><dd>${m.qRange[0].toFixed(0)}–${m.qRange[1].toFixed(0)} m³/s</dd><dt>Montjean to Mauves</dt><dd>${m.qlagH} h</dd>
  <dt>Saint-Nazaire tide</dt><dd>predicted from the gauge record, ${esc(fmt(m.tide.from, "d LLL yyyy"))} to ${esc(fmt(m.tide.to, "d LLL yyyy"))} (${m.tide.names.length} constituents, ±${(m.tide.rmse * 100).toFixed(0)} cm without surge)</dd>
  <dt>Falling tide</dt><dd>curve after each Saint-Nazaire high water, shaped by its high and low water and the flow</dd>
  <dt>Minimum level error</dt><dd>±${(m.rmseHmin * 100).toFixed(0)} cm</dd><dt>Low-tide time error</dt><dd>±${Math.round(m.rmseLowMin)} min</dd>
  <dt>Wave start / end error</dt><dd>${m.validation.startRmseMin !== null ? `±${m.validation.startRmseMin.toFixed(0)} / ±${m.validation.endRmseMin!.toFixed(0)} min (${m.validation.n} lows with a wave, each month predicted from a fit without it)` : "not enough waves yet"}</dd>
  <dt>Wave / no wave right</dt><dd>${m.validation.hit} of ${m.validation.total} low tides</dd></dl>` : "<p>Not fitted yet.</p>"}
  <h2>Activity</h2><div class="log">${info.log.slice(-60).reverse().map((l) => `${esc(fmt(l.t, "d LLL HH:mm:ss"))}  ${esc(l.msg)}`).join("\n") || "Nothing yet."}</div>`, banner);
}

const cmOf = (m: number) => `${Math.round(m * 100)} cm`;
const key = (cls: string) => `<svg viewBox="0 0 28 10" aria-hidden="true"><line x1="0" x2="28" y1="5" y2="5" class="${cls}"/></svg>`;
const swatch = (cls: string) => `<svg viewBox="0 0 28 10" aria-hidden="true"><rect x="0" y="0" width="28" height="10" class="${cls}"/></svg>`;

/** Hover readout: every series at the time under the pointer. */
const SIM_SCRIPT = `(() => {
  const box = document.querySelector(".simchart"), data = JSON.parse(document.getElementById("simdata").textContent);
  if (!box) return;
  const L = +box.dataset.l, R = +box.dataset.r, W = +box.dataset.w, tip = box.querySelector(".tip"), cross = box.querySelector(".cross");
  const t0 = data.t0, t1 = data.t1, n = data.p.length;
  const f = (v, d, u) => v === null ? "–" : v.toFixed(d) + u;
  const row = (label, value) => { const r = document.createElement("div"), a = document.createElement("span"), b = document.createElement("b");
    a.textContent = label; b.textContent = value; r.append(a, b); return r; };
  const move = (ev) => {
    const svg = box.querySelector("svg"), rect = svg.getBoundingClientRect(), vx = (ev.clientX - rect.left) / rect.width * W;
    if (vx < L || vx > W - R) { tip.hidden = true; cross.setAttribute("visibility", "hidden"); return; }
    const i = Math.max(0, Math.min(n - 1, Math.round((vx - L) / (W - L - R) * (n - 1)))), p = data.p[i];
    const cx = L + i / (n - 1) * (W - L - R);
    cross.setAttribute("x1", cx); cross.setAttribute("x2", cx); cross.setAttribute("visibility", "visible");
    tip.replaceChildren(row("", p[0]), ...data.cols.map(([label, d, u], k) => row(label, f(p[k + 1], d, u))));
    tip.hidden = false;
    const px = (ev.clientX - box.getBoundingClientRect().left);
    tip.style.left = (px > box.clientWidth / 2 ? px - tip.offsetWidth - 14 : px + 14) + "px";
  };
  box.addEventListener("pointermove", move);
  box.addEventListener("pointerleave", () => { tip.hidden = true; cross.setAttribute("visibility", "hidden"); });
})();`;

/** The simulated week chart with its legend and hover readout. Without the real flow (a forecast),
 *  the run with the real flow is left out: past now it is the same as the simulation. */
function simulationBlock(v: WeekView, withRealFlow = true): string {
  type Col = [string, number, string, (p: WeekView["points"][number]) => number];
  const all: Col[] = [["Real", 2, " m", (p) => p.real], ["Simulated", 2, " m", (p) => p.sim],
    ["With real flow", 2, " m", (p) => p.simReal], ["Flow used", 0, " m³/s", (p) => p.qAssumed], ["Real flow", 0, " m³/s", (p) => p.qReal]];
  const cols = all.filter((c) => withRealFlow || c[0] !== "With real flow");
  const data = { t0: v.t0, t1: v.t1, cols: cols.map(([l, d, u]) => [l, d, u]),
    p: v.points.map((p) => [fmt(p.t, "ccc d HH:mm"), ...cols.map(([, , , get]) => { const x = get(p); return Number.isFinite(x) ? Math.round(x * 100) / 100 : null; })]) };
  return `<div class="legend"><span>${key("obs")}Real (Mauves gauge)</span><span>${key("sim")}Simulated</span>
    ${withRealFlow ? `<span>${key("sim-real")}Simulated with the real flow</span>` : ""}<span>${swatch("win-sim")}Simulated wave</span><span>${swatch("win-obs")}Real wave</span></div>
  <div class="scroll chart-wrap" style="margin-top:0">${simulationCharts(v, withRealFlow)}</div>
  <script type="application/json" id="simdata">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>
  <script>${SIM_SCRIPT}</script>`;
}

export function simulatePage(v: WeekView | null, start: string, bounds: { min: string; max: string }, bt: { known: Score; real: Score } | null,
  problem?: string): string {
  const shift = (days: number) => { const d = local(v ? v.t0 : Date.now()).plus({ days }); return d.toFormat("yyyy-LL-dd"); };
  const inRange = (d: string) => d >= bounds.min && d <= bounds.max;
  const picker = `<div class="months">${inRange(shift(-7)) ? `<a href="/simulate?start=${shift(-7)}">← Previous week</a>` : ""}
    <form class="inline" style="margin:0" method="get" action="/simulate">
      <label>Week starting<input type="date" name="start" value="${esc(start)}" min="${bounds.min}" max="${bounds.max}" required></label>
      <button type="submit">Simulate</button></form>
    ${inRange(shift(7)) ? `<a href="/simulate?start=${shift(7)}">Next week →</a>` : ""}</div>`;
  const intro = `<h1>Simulation</h1>
  <p>The level at Mauves for a week, simulated from what was known at midnight on its first day: the Montjean flow until then
  and its trend, the level at Mauves the day before, and the Saint-Nazaire tide. The bigger the tide, the stronger it pushes up the
  Loire; the more water comes down, the later and weaker the push and the higher the low. Compared with the gauge where there is data.</p>`;
  if (!v) return layout("Simulation", "/simulate", `${intro}${picker}<p class="warn">${esc(problem ?? "No simulation.")}</p>`);

  const e = v.errors, past = e.n > 0;
  // each row is dated by its wave (5 to 7 h before the low), or by the low when there is none
  const lowRows = v.lows.map((l) => {
    const t = l.simWindow?.[0] ?? l.obsWindow?.[0] ?? (l.sim ?? l.obs)!.tmin, day = fmt(t, "yyyy-LL-dd");
    const at = (x: number) => fmt(x, "yyyy-LL-dd") === day ? hm(x) : `${fmt(x, "ccc")} ${hm(x)}`;
    const w = (x: [number, number] | null) => x ? `${at(x[0])} to ${at(x[1])}` : "–";
    const low = (x: { tmin: number; hmin: number } | null) => x ? `${at(x.tmin)} &nbsp;${x.hmin.toFixed(2)} m` : "–";
    return `<tr><td>${esc(dayLabel(t))}</td><td>${l.coef !== null ? l.coef.toFixed(0) : "–"}</td>
      <td class="win">${w(l.simWindow)}</td><td class="win">${l.obs ? w(l.obsWindow) : "–"}</td><td>${low(l.sim)}</td><td>${low(l.obs)}</td></tr>`;
  }).join("");
  const k = bt?.known, r = bt?.real;
  return layout("Simulation", "/simulate", `${intro}${picker}
  <dl><dt>Flow at the start</dt><dd>${v.q0.toFixed(0)} m³/s at Montjean</dd>
  ${v.coefs ? `<dt>Coefficients</dt><dd>${v.coefs[0]} to ${v.coefs[1]}</dd>` : ""}
  <dt>Level correction</dt><dd>${Math.abs(v.bias) >= 0.005 ? `${v.bias > 0 ? "+" : "−"}${cmOf(Math.abs(v.bias))} from the day before, fading over a few days` : "none"}</dd>
  ${past ? `<dt>This week</dt><dd>simulated level off by ±${cmOf(e.rmse)} (mean ${e.mean >= 0 ? "+" : "−"}${cmOf(Math.abs(e.mean))});
    ±${cmOf(e.rmseReal)} with the flow that really came</dd>` : `<dt>This week</dt><dd>no gauge data yet</dd>`}</dl>
  ${simulationBlock(v)}
  <h2>Waves and low tides</h2>
  <div class="scroll"><table><thead><tr><th>Day</th><th>Coef.</th><th>Simulated wave</th><th>Real wave</th><th>Simulated low</th><th>Real low</th></tr></thead>
  <tbody>${lowRows}</tbody></table></div>
  ${k && r ? `<h2>How good it is</h2>
  <p>Every week of the record simulated the same way (${k.weeks} weeks), each from a fit that left its four weeks out:</p>
  <div class="scroll"><table><thead><tr><th></th><th>Level</th><th>Day 1</th><th>Day 4</th><th>Day 7</th><th>Flow &lt; 300 m³/s</th><th>Level of the low</th><th>Wave start / end</th><th>Wave or not right</th></tr></thead><tbody>
  ${[["From the start of the week", k], ["With the real flow", r]].map(([label, x]) => { const s = x as Score; return `<tr><td>${label}</td><td>±${cmOf(s.level.rms)}</td>
    <td>±${cmOf(s.byDay[0].rms)}</td><td>±${cmOf(s.byDay[3].rms)}</td><td>±${cmOf(s.byDay[6].rms)}</td><td>±${cmOf(s.byFlow[0].rms)}</td>
    <td>±${cmOf(s.lowH.rms)}</td><td>±${s.start.rms.toFixed(0)} / ±${s.end.rms.toFixed(0)} min</td><td>${Math.round(100 * s.hit / s.total)}%</td></tr>`; }).join("")}
  </tbody></table></div>
  <p class="note">Most of the error comes from not knowing the flow to come: floods can't be seen coming from Montjean alone.
  At summer flows the simulation stays within about ${cmOf(k.byFlow[0].rms)} all week.</p>` : ""}
  <p class="note">Times are local. The level model fits the Mauves level over each Saint-Nazaire tide to the tide's high and low water, the next high water and the flow, and joins consecutive tides smoothly.
  ${v.fold !== null ? "This week was simulated with a fit that didn't see it or the weeks around it." : ""}</p>`);
}
