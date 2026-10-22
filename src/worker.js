// Runs the same addon on Cloudflare Workers.
import data from "../data/catalogs.json";
import { createAddon, CORS } from "./addon.js";

export default {
  fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    const { route } = createAddon(data, { baseUrl: url.origin });
    const { status = 200, json, html } = route(url.pathname);

    return new Response(html ?? JSON.stringify(json), {
      status,
      headers: {
        "Content-Type": html ? "text/html; charset=utf-8" : "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        ...CORS,
      },
    });
  },
};
