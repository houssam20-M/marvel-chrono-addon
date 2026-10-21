// Resolves every title in src/titles.js to an IMDb id through Cinemeta, then
// fetches its metadata and writes data/catalogs.json for the server to serve.
// Run: node scripts/resolve-ids.mjs
import { writeFile } from "node:fs/promises";
import { CATALOGS } from "../src/titles.js";

const CINEMETA = "https://v3-cinemeta.strem.io";

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const startYear = (releaseInfo) => parseInt(String(releaseInfo ?? "").slice(0, 4), 10);

async function getJSON(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
}

// Pick the search hit whose name matches and whose year is closest to ours.
function pickMatch(entry, metas) {
  const want = norm(entry.title);
  const scored = metas
    .map((m, index) => {
      const name = norm(m.name);
      const year = startYear(m.releaseInfo);
      let score = 0;
      if (name === want) score += 100;
      else if (name.startsWith(want) || want.startsWith(name)) score += 40;
      else return null;
      const drift = Number.isFinite(year) ? Math.abs(year - entry.year) : 99;
      score -= drift * 10;
      // Cinemeta returns duplicate stub entries for some titles: the real one
      // has artwork, and search is ordered by popularity, so prefer both.
      if (m.poster) score += 25;
      score -= index * 0.5;
      return { meta: m, score, year, drift };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  return scored[0] && scored[0].drift <= 2 ? scored[0] : null;
}

async function resolve(entry) {
  if (entry.imdb) return { id: entry.imdb, source: "pinned" };
  const url = `${CINEMETA}/catalog/${entry.type}/top/search=${encodeURIComponent(entry.title)}.json`;
  const { metas = [] } = await getJSON(url);
  const hit = pickMatch(entry, metas);
  return hit ? { id: hit.meta.id, source: `search(drift ${hit.drift})` } : null;
}

async function fetchMeta(type, id) {
  const data = await getJSON(`${CINEMETA}/meta/${type}/${id}.json`);
  return data?.meta ?? null;
}

const out = [];
const failures = [];

for (const catalog of CATALOGS) {
  const items = [];
  for (const [index, entry] of catalog.titles.entries()) {
    const found = await resolve(entry);
    if (!found) {
      failures.push(`${catalog.id}: ${entry.title} (${entry.year}) — no match`);
      console.log(`  ✗ ${entry.title} (${entry.year})`);
      continue;
    }
    const meta = await fetchMeta(entry.type, found.id);
    if (!meta) {
      failures.push(`${catalog.id}: ${entry.title} — ${found.id} has no meta`);
      console.log(`  ✗ ${entry.title} — meta missing for ${found.id}`);
      continue;
    }
    items.push({
      id: meta.id,
      type: entry.type,
      name: meta.name,
      poster: meta.poster,
      background: meta.background,
      logo: meta.logo,
      description: meta.description,
      releaseInfo: meta.releaseInfo,
      imdbRating: meta.imdbRating,
      genres: meta.genres,
      runtime: meta.runtime,
      order: index + 1,
      note: entry.note,
    });
    console.log(`  ✓ ${String(index + 1).padStart(3)} ${meta.id}  ${meta.name} (${meta.releaseInfo})  [${found.source}]`);
  }
  out.push({ id: catalog.id, name: catalog.name, description: catalog.description, items });
  console.log(`${catalog.id}: ${items.length}/${catalog.titles.length}\n`);
}

await writeFile(
  new URL("../data/catalogs.json", import.meta.url),
  JSON.stringify({ generatedAt: new Date().toISOString(), catalogs: out }, null, 2),
);

console.log(`Wrote data/catalogs.json — ${out.reduce((n, c) => n + c.items.length, 0)} items`);
if (failures.length) {
  console.log(`\n${failures.length} unresolved:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exitCode = 1;
}
