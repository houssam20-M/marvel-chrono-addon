<img src="assets/marvel-banner.png" alt="Marvel" width="100%">

# Marvel Chronological — Stremio addon

Every Marvel film and series as Stremio catalogs, ordered chronologically and
split by universe. The addon serves catalogs only; metadata comes from Cinemeta
and streams come from whatever stream addons you already have installed.

| Catalog | Titles | Order |
|---|---|---|
| Marvel — MCU | 58 | In-universe chronology, films + Disney+ series + specials |
| Marvel — Defenders Saga & Marvel TV | 10 | Netflix street-level shows, then the other Marvel TV series |
| Marvel — X-Men | 16 | Fox mutant timeline by when the story is set |
| Marvel — Spider-Man (Sony) | 13 | Raimi, Webb, Spider-Verse, then the SSU |
| Marvel — Classics (pre-MCU) | 17 | Release order |

## Install

Nothing to clone and nothing to run. In Stremio: **Addons** → paste the URL →
**Install**.

```
https://marvel-chrono-addon.houssam20.workers.dev/manifest.json
```

It is hosted on Cloudflare Workers, so the same URL works on phones and TVs.

## Run your own copy

If you'd rather host it yourself, or want to change the order:

```bash
git clone https://github.com/houssam20-M/marvel-chrono-addon
cd marvel-chrono-addon
node src/server.js
```

Then in Stremio: **Addons** → `http://127.0.0.1:7000/manifest.json` → **Install**.

To keep it running across reboots, install it as a systemd user service:

```bash
systemctl --user status marvel-chrono-addon     # check
systemctl --user restart marvel-chrono-addon    # after editing the data
systemctl --user disable --now marvel-chrono-addon
```

## Deploy

`src/addon.js` holds the manifest and routing; `src/server.js` runs it on Node
and `src/worker.js` runs the same code on Cloudflare Workers.

```bash
npm install wrangler
npx wrangler deploy
```

## Editing the list

`src/titles.js` is the source of truth: titles, order, universe and the note
shown under each entry. IMDb ids are resolved by name + year through Cinemeta;
when a title's Cinemeta name differs from the common one, pin it with
`imdb: "tt…"` on that entry.

```bash
node scripts/resolve-ids.mjs                 # rewrites data/catalogs.json
systemctl --user restart marvel-chrono-addon
```

The resolver verifies every match by name and release year and exits non-zero
listing anything it could not resolve.

## Layout

```
src/titles.js            ordered title lists, per universe
src/addon.js             manifest + catalog routing, shared by both runtimes
src/server.js            runs the addon on Node, for local use
src/worker.js            runs the same addon on Cloudflare Workers
scripts/resolve-ids.mjs  title -> IMDb id -> Cinemeta metadata
scripts/download_posters.py  saves every poster, numbered, to ~/Pictures
data/catalogs.json       generated; what both runtimes actually serve
```
