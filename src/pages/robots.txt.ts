import type { APIRoute } from "astro";

import { baseUrl } from "../lib/urls";

export const GET: APIRoute = ({ site }) => {
  const sitemapUrl = new URL(
    `${baseUrl}sitemap-index.xml`,
    site ?? "http://localhost:4321",
  );
  const body = [
    "User-agent: *",
    `Allow: ${baseUrl}`,
    "",
    `Sitemap: ${sitemapUrl.href}`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
