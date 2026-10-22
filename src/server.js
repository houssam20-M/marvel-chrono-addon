// Runs the addon on Node, for local use.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createAddon, CORS } from "./addon.js";

const PORT = Number(process.env.PORT ?? 7000);
const HOST = process.env.HOST ?? "127.0.0.1";

const data = JSON.parse(await readFile(new URL("../data/catalogs.json", import.meta.url), "utf8"));
const { route } = createAddon(data, { baseUrl: `http://${HOST}:${PORT}` });

const server = createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }

  const { status = 200, json, html } = route(new URL(req.url, `http://${req.headers.host ?? HOST}`).pathname);
  const body = html ?? JSON.stringify(json);
  res.writeHead(status, {
    "Content-Type": html ? "text/html; charset=utf-8" : "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
    "Content-Length": Buffer.byteLength(body),
    ...CORS,
  });
  res.end(body);
});

server.listen(PORT, HOST, () => {
  console.log(`Marvel Chronological addon → http://${HOST}:${PORT}/manifest.json`);
  for (const c of data.catalogs) console.log(`  ${c.id.padEnd(10)} ${String(c.items.length).padStart(3)} titles  ${c.name}`);
});
