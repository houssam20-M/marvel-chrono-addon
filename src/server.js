// Stremio addon: Marvel catalogs in chronological order.
// Protocol: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/README.md
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const PORT = Number(process.env.PORT ?? 7000);
const HOST = process.env.HOST ?? "127.0.0.1";

const { catalogs, generatedAt } = JSON.parse(
  await readFile(new URL("../data/catalogs.json", import.meta.url), "utf8"),
);

// Stremio asks for a catalog by (type, id). Every catalog here mixes movies and
// series, so each one is declared under both types and answers the same list;
// each item keeps its own type, which is what Stremio navigates by.
const MANIFEST = {
  id: "community.marvel.chronological",
  version: "1.0.0",
  name: "Marvel Chronological",
  description:
    "Every Marvel film and series in chronological order, split by universe: MCU, Defenders saga, X-Men, Sony's Spider-Man and the pre-MCU classics.",
  logo: "https://images.metahub.space/logo/medium/tt4154796/img",
  background: "https://images.metahub.space/background/medium/tt4154796/img",
  resources: ["catalog"],
  types: ["movie", "series"],
  idPrefixes: ["tt"],
  catalogs: catalogs.flatMap((c) =>
    ["movie", "series"].map((type) => ({
      type,
      id: c.id,
      name: c.name,
      extra: [{ name: "skip", isRequired: false }],
    })),
  ),
  behaviorHints: { configurable: false, configurationRequired: false },
};

const byId = new Map(catalogs.map((c) => [c.id, c]));

// A catalog item: Stremio shows name/poster, and `description` carries the
// chronological position so the order is readable inside the app too.
const toPreview = (item, catalog) => ({
  id: item.id,
  type: item.type,
  name: item.name,
  poster: item.poster,
  posterShape: "poster",
  background: item.background,
  logo: item.logo,
  description: `#${item.order} in ${catalog.name}${item.note ? ` — ${item.note}` : ""}\n\n${item.description ?? ""}`,
  releaseInfo: item.releaseInfo,
  imdbRating: item.imdbRating,
  genres: item.genres,
  runtime: item.runtime,
});

const json = (res, body, status = 200) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    // Stremio's web and desktop players fetch this cross-origin.
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Cache-Control": "public, max-age=3600",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? HOST}`);
  const path = decodeURIComponent(url.pathname);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    });
    return res.end();
  }

  if (path === "/manifest.json") return json(res, MANIFEST);

  // /catalog/:type/:id.json  and  /catalog/:type/:id/skip=100.json
  const match = path.match(/^\/catalog\/(movie|series)\/([^/]+?)(?:\/(.+))?\.json$/);
  if (match) {
    const [, type, id, extra] = match;
    const catalog = byId.get(id);
    if (!catalog) return json(res, { metas: [] }, 404);

    const skip = Number(new URLSearchParams((extra ?? "").replace(/&?skip=/, "skip=")).get("skip") ?? 0);
    const metas = catalog.items
      .slice(Number.isFinite(skip) && skip > 0 ? skip : 0)
      .map((item) => toPreview(item, catalog));
    return json(res, { metas });
  }

  if (path === "/" || path === "/index.html") {
    const rows = catalogs
      .map((c) => `<li><strong>${c.name}</strong> — ${c.items.length} titles</li>`)
      .join("");
    const html = `<!doctype html><meta charset="utf-8"><title>Marvel Chronological</title>
<style>body{font-family:system-ui,sans-serif;max-width:46rem;margin:3rem auto;padding:0 1rem;line-height:1.6;background:#14121f;color:#eee}
code{background:#241f35;padding:.15rem .4rem;border-radius:.25rem}a{color:#8ab4ff}</style>
<h1>Marvel Chronological</h1>
<p>A Stremio catalog addon. Add this URL in Stremio:</p>
<p><code>http://${HOST}:${PORT}/manifest.json</code></p>
<ul>${rows}</ul>
<p>Data generated ${generatedAt}. Metadata from Cinemeta.</p>`;
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(html);
  }

  json(res, { err: "not found" }, 404);
});

server.listen(PORT, HOST, () => {
  console.log(`Marvel Chronological addon → http://${HOST}:${PORT}/manifest.json`);
  for (const c of catalogs) console.log(`  ${c.id.padEnd(10)} ${String(c.items.length).padStart(3)} titles  ${c.name}`);
});
