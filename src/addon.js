// The addon itself: manifest + routing, with no runtime of its own.
// src/server.js runs it on Node; src/worker.js runs it on Cloudflare Workers.

export function createAddon({ catalogs, generatedAt }, { baseUrl } = {}) {
  const manifest = {
    id: "community.marvel.chronological",
    version: "1.1.0",
    name: "Marvel Chronological",
    description:
      "Every Marvel film and series in chronological order, split by universe: MCU, Defenders saga, X-Men, Sony's Spider-Man and the pre-MCU classics.",
    logo: "https://images.metahub.space/logo/medium/tt4154796/img",
    background: "https://images.metahub.space/background/medium/tt4154796/img",
    resources: ["catalog"],
    types: ["movie", "series"],
    idPrefixes: ["tt"],
    // Each catalog mixes films and series, so it is declared under both types
    // and answers the same list; every item keeps its own type.
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

  function route(pathname) {
    const path = decodeURIComponent(pathname);

    if (path === "/manifest.json") return { json: manifest };

    const match = path.match(/^\/catalog\/(movie|series)\/([^/]+?)(?:\/(.+))?\.json$/);
    if (match) {
      const [, , id, extra] = match;
      const catalog = byId.get(id);
      if (!catalog) return { status: 404, json: { metas: [] } };
      const skip = Number(new URLSearchParams((extra ?? "").replace(/&?skip=/, "skip=")).get("skip") ?? 0);
      const from = Number.isFinite(skip) && skip > 0 ? skip : 0;
      return { json: { metas: catalog.items.slice(from).map((i) => toPreview(i, catalog)) } };
    }

    if (path === "/" || path === "/index.html") return { html: landing() };

    return { status: 404, json: { err: "not found" } };
  }

  function landing() {
    const rows = catalogs
      .map((c) => `<li><strong>${c.name}</strong> — ${c.items.length} titles</li>`)
      .join("");
    return `<!doctype html><meta charset="utf-8"><title>Marvel Chronological</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui,sans-serif;max-width:46rem;margin:3rem auto;padding:0 1rem;line-height:1.6;background:#14121f;color:#eee}
code{background:#241f35;padding:.15rem .4rem;border-radius:.25rem;word-break:break-all}a{color:#8ab4ff}</style>
<h1>Marvel Chronological</h1>
<p>A Stremio catalog addon. Add this URL in Stremio:</p>
<p><code>${baseUrl ?? ""}/manifest.json</code></p>
<ul>${rows}</ul>
<p>Data generated ${generatedAt}. Metadata from Cinemeta.</p>`;
  }

  return { manifest, route };
}

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
