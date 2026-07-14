import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { siteData } from "../src/data/site";

const workspaceRoot = fileURLToPath(new URL("../", import.meta.url));
const publicSiteUrl = "https://example.github.io";
const publicBasePath = "/sample-repo";

let outputDirectory = "";

function visibleText(fragment: string): string {
  return fragment
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function linkHref(html: string, label: string): string | undefined {
  for (const match of html.matchAll(
    /<a\b(?=[^>]*\bhref="([^"]+)")[^>]*>([\s\S]*?)<\/a>/g,
  )) {
    if (visibleText(match[2] ?? "") === label) {
      return match[1];
    }
  }

  return undefined;
}

async function generatedFile(relativePath: string): Promise<string> {
  const file = Bun.file(join(outputDirectory, relativePath));

  expect(
    await file.exists(),
    `Expected Astro to generate ${relativePath}`,
  ).toBe(true);

  return file.text();
}

beforeAll(async () => {
  outputDirectory = await mkdtemp(join(tmpdir(), "archive-404-services-"));
  const buildScript = `
    import { build } from "astro";
    await build({
      root: ${JSON.stringify(workspaceRoot)},
      outDir: ${JSON.stringify(outputDirectory)},
      logLevel: "silent",
    });
  `;
  const buildProcess = Bun.spawn({
    cmd: [process.execPath, "--eval", buildScript],
    cwd: workspaceRoot,
    env: {
      ...process.env,
      SITE_URL: publicSiteUrl,
      BASE_PATH: publicBasePath,
      FORCE_COLOR: "0",
    },
    stdout: "ignore",
    stderr: "pipe",
  });
  const buildError = await new Response(buildProcess.stderr).text();

  expect(await buildProcess.exited, buildError).toBe(0);
});

afterAll(async () => {
  if (outputDirectory) {
    await rm(outputDirectory, { force: true, recursive: true });
  }
});

describe("generated archive service pages", () => {
  test.each([
    {
      file: "404.html",
      heading: "ФАЙЛ НЕ НАЙДЕН",
      requiredCopy: ["404", "АРХИВНЫЙ ФАЙЛ ПОТЕРЯН"],
      actions: ["Вернуться в архив", "Связаться"],
    },
    {
      file: "maintenance/index.html",
      heading: "АРХИВ ВРЕМЕННО НЕДОСТУПЕН",
      requiredCopy: ["ТЕХНИЧЕСКОЕ ОБСЛУЖИВАНИЕ", "СИСТЕМА: ОБСЛУЖИВАНИЕ"],
      actions: ["Вернуться в архив", "Связаться"],
    },
  ])("renders $file as one useful noindex document", async (servicePage) => {
    const html = await generatedFile(servicePage.file);
    const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];
    const pageText = visibleText(html);

    expect(headings).toHaveLength(1);
    expect(visibleText(headings[0]?.[1] ?? "")).toBe(servicePage.heading);
    expect(html).toMatch(
      /<meta\b(?=[^>]*\bname="robots")(?=[^>]*\bcontent="[^"]*noindex[^"]*")[^>]*>/,
    );

    for (const copy of servicePage.requiredCopy) {
      expect(pageText).toContain(copy);
    }

    expect(linkHref(html, servicePage.actions[0]!)).toBe("/sample-repo/");
    expect(linkHref(html, servicePage.actions[1]!)).toBe(
      "/sample-repo/#contact",
    );
    expect(html).not.toContain('href="mailto:');
    expect(html).not.toContain('href="https://t.me/');
  });

  test("keeps shared header links useful from non-home routes", async () => {
    const html = await generatedFile("maintenance/index.html");

    expect(linkHref(html, "АРХИВ №404 БЮРО ЦИФРОВЫХ КОНСТРУКЦИЙ")).toBe(
      "/sample-repo/#hero",
    );
    expect(linkHref(html, "КОНТАКТЫ")).toBe("/sample-repo/#contact");
  });

  test("uses a static maintenance notice without an HTTP 503 claim", async () => {
    const html = await generatedFile("maintenance/index.html");
    const pageText = visibleText(html);

    expect(pageText).toContain("SERVICE / PAUSE");
    expect(pageText).not.toContain("503");
  });

  test("emits browser-valid selectors in the inline status styles", async () => {
    const html = await generatedFile("404.html");

    expect(html).not.toContain(":global(");
    expect(html).toContain(
      ".archive-status__action-icon .technical-icon",
    );
  });
});

describe("generated SEO assets", () => {
  test("renders canonical and Open Graph metadata without inventing an image", async () => {
    const html = await generatedFile("index.html");

    expect(html).toContain(
      '<link rel="canonical" href="https://example.github.io/sample-repo/">',
    );
    expect(html).toContain(
      '<meta property="og:url" content="https://example.github.io/sample-repo/">',
    );
    expect(html).toContain(
      `<meta property="og:title" content="${siteData.seo.title}">`,
    );
    expect(html).toContain(
      `<meta property="og:description" content="${siteData.seo.description}">`,
    );
    expect(html).toContain('<meta property="og:type" content="website">');
    expect(html).toContain('<meta property="og:locale" content="ru_RU">');
    expect(html).not.toContain('property="og:image"');
  });

  test("ships a base-aware code-native favicon", async () => {
    const html = await generatedFile("index.html");
    const favicon = await generatedFile("favicon.svg");

    expect(html).toContain(
      '<link rel="icon" type="image/svg+xml" href="/sample-repo/favicon.svg">',
    );
    expect(favicon).toContain("<svg");
    expect(favicon.length).toBeLessThan(2_500);
  });

  test("generates public robots rules with the base-aware sitemap URL", async () => {
    const robots = await generatedFile("robots.txt");

    expect(robots).toContain("User-agent: *");
    expect(robots).toContain("Allow: /sample-repo/");
    expect(robots).toContain(
      "Sitemap: https://example.github.io/sample-repo/sitemap-index.xml",
    );
  });

  test("generates a sitemap that contains home and excludes service routes", async () => {
    const sitemapFiles = [
      ...new Bun.Glob("sitemap*.xml").scanSync({
        cwd: outputDirectory,
        onlyFiles: true,
      }),
    ].sort();
    const sitemap = (
      await Promise.all(
        sitemapFiles.map((file) => Bun.file(join(outputDirectory, file)).text()),
      )
    ).join("\n");

    expect(sitemapFiles).toContain("sitemap-index.xml");
    expect(sitemap).toContain(
      "<loc>https://example.github.io/sample-repo/</loc>",
    );
    expect(sitemap).not.toMatch(/<loc>[^<]*(?:404|maintenance)[^<]*<\/loc>/);
  });
});
