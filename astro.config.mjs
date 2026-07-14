import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

const localSiteUrl = "http://localhost:4321";

function siteUrlFromEnvironment(value) {
  if (value === undefined) {
    return localSiteUrl;
  }

  try {
    const siteUrl = new URL(value);
    const canonicalOrigins = [siteUrl.origin, `${siteUrl.origin}/`];
    const matchesCanonicalOrigin = canonicalOrigins.some(
      (canonicalOrigin) => canonicalOrigin.toLowerCase() === value.toLowerCase(),
    );

    if (
      (siteUrl.protocol !== "http:" && siteUrl.protocol !== "https:") ||
      siteUrl.username ||
      siteUrl.password ||
      !matchesCanonicalOrigin
    ) {
      throw new Error();
    }

    return siteUrl.origin;
  } catch (error) {
    throw new Error(
      `Invalid SITE_URL ${JSON.stringify(value)}: expected a canonical http(s) origin with at most one trailing slash, such as https://example.github.io`,
      { cause: error },
    );
  }
}

function basePathFromEnvironment(value) {
  if (value === undefined) {
    return "/";
  }

  const normalizedValue = value.trim();

  if (value !== normalizedValue) {
    throw new Error(
      `Invalid BASE_PATH ${JSON.stringify(value)}: expected / for a root site or a leading-slash path such as /sample-repo`,
    );
  }

  if (normalizedValue === "/") {
    return "/";
  }

  const validPath = /^\/[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*\/?$/;
  const segments = normalizedValue.split("/").filter(Boolean);

  if (
    !normalizedValue ||
    !validPath.test(normalizedValue) ||
    segments.some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error(
      `Invalid BASE_PATH ${JSON.stringify(value)}: expected / for a root site or a leading-slash path such as /sample-repo`,
    );
  }

  return `/${segments.join("/")}`;
}

const site = siteUrlFromEnvironment(process.env.SITE_URL);
const base = basePathFromEnvironment(process.env.BASE_PATH);

export default defineConfig({
  output: "static",
  site,
  base,
  integrations: [
    sitemap({
      filter: (page) =>
        !/\/(?:404(?:\.html)?|maintenance)\/?$/.test(new URL(page).pathname),
    }),
  ],
});
