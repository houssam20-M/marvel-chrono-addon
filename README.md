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

## Run it

```bash
node src/server.js          # http://127.0.0.1:7000/manifest.json
```

It is also installed as a systemd user service, so it starts with the session:

```bash
systemctl --user status marvel-chrono-addon     # check
systemctl --user restart marvel-chrono-addon    # after editing the data
systemctl --user disable --now marvel-chrono-addon
```

## Install in Stremio

Stremio → **Addons** → paste `http://127.0.0.1:7000/manifest.json` → **Install**.

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
src/titles.js          ordered title lists, per universe
src/server.js          addon server (manifest + catalog endpoints, zero deps)
scripts/resolve-ids.mjs  title -> IMDb id -> Cinemeta metadata
data/catalogs.json     generated; what the server actually serves
```
