# Mauves wave

A website that forecasts when the static wave works on the Loire at Mauves-sur-Loire.

It works on the falling tide only, while the Mauves gauge is between 5.25 m and 4.75 m.
The site downloads gauge data by itself: the Mauves level and the Loire flow at Montjean.
It learns from two years of history how the tide and the river flow shape each low tide,
and forecasts the next sessions.

## Run it with Docker

You need Docker Desktop. In this folder:

    docker compose up -d --build

Then open http://localhost:3000.

On the first start it downloads two years of gauge history, which takes a few minutes.
You can follow it on the Data page.

### Tide pages

maree.info doesn't allow automated downloading, so you copy its pages yourself.

1. Open the page in your browser.
2. Select everything and copy it (Cmd+A, Cmd+C).
3. Paste it on the **Tide pages** page.

- **Calendar pages** give the coefficients. Use https://maree.info/117/calendrier?d=202609,
  changing `d=YYYYMM` for each month. Copy as many months of the last two years as you
  can; the Tide pages page lists the missing ones.
- **The weekly table** at https://maree.info/117 gives exact times. Copy it once a week.

### Sessions

Record sessions you saw on the **Sessions** page. Each one is checked against the gauge
and the model, and together they show where the wave really starts and stops.

## Claude Code

Claude Code runs in its own container (`mauves-claude`), apart from the website. Build it
once, then start it in the project folder:

    ./build.sh
    ./claude.sh

`./claude.sh` builds the image itself if it's missing, and passes its arguments on to
`claude` (`./claude.sh -c` continues the last conversation, `./claude.sh --shell` opens a
shell instead). Run `./build.sh --no-cache` to update Claude Code.

The first time, log in with the link it shows. You can also put `ANTHROPIC_API_KEY=...`
in a `.env` file next to `docker-compose.yml` instead.

Your login, settings and conversation history are stored in the `claude-data` volume, so
they are kept between runs and rebuilds. Claude reads `CLAUDE.md` for the project background.
It sees the website's data read-only at `/data`, and can reach the running site at
http://wave:3000.

The project folder is shared with both containers, so changes Claude makes are saved on
your computer. The website recompiles and restarts by itself a second or two after a file
in `src/` changes (`docker compose logs -f wave` shows it). Changes to
`docker-compose.yml` or `package.json` still need:

    docker compose up -d wave

If Claude adds npm packages, rebuild both images with fresh dependencies:

    docker compose up -d --build -V
    ./build.sh

## Where things are kept

| Volume | Contents |
|---|---|
| `wave-data` | gauge readings, pasted tide pages, sessions, fitted model |
| `claude-data` | Claude Code login, settings, history |

Both survive `docker compose down` and rebuilds. `docker compose down -v` deletes them.

To back up the wave data:

    docker run --rm -v mauves_wave-data:/data -v "$PWD":/backup alpine tar czf /backup/wave-data.tgz -C /data .

The volume name starts with the folder name; `docker volume ls` shows it.

## Settings

Set these under `environment:` in `docker-compose.yml`:

| Variable | Default | Meaning |
|---|---|---|
| `WAVE_UPPER` | 5.25 | level (m) where the wave starts on the falling tide |
| `WAVE_LOWER` | 4.75 | level (m) where it stops |
| `HISTORY_YEARS` | 2 | history downloaded on first start |
| `UPDATE_EVERY_MIN` | 30 | how often gauge data is refreshed |
| `OFFLINE` | – | `1` turns off all downloads |

## Without Docker

Node 20 or newer:

    npm install
    npm run build
    npm start

Data then goes in `./data`.

## JSON API

`GET /api/forecast?days=7&flow=250` returns the coming low tides and wave windows.

## Notes

- On Linux hosts, the container runs as user `node` (uid 1000). If your user has a
  different uid, the shared project folder may not be writable from the container. This
  is not an issue on a Mac.
- Hub'Eau keeps one month of data online. If the site is off for longer, the gap is
  filled from hydro.eaufrance.fr. That source is not an official API and may change.
