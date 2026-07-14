import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "astro";

import { siteData } from "../src/data/site";

const workspaceRoot = fileURLToPath(new URL("../", import.meta.url));
const expectedSectionOrder = [
  "hero",
  "projects",
  "services",
  "technologies",
  "process",
  "about",
  "contact",
] as const;
const expectedNavTargets = [
  "#about",
  "#services",
  "#projects",
  "#process",
  "#technologies",
  "#contact",
] as const;

let outputDirectory = "";
let pageHtml = "";
let pageCss = "";

function visibleText(fragment: string): string {
  return fragment
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

beforeAll(async () => {
  outputDirectory = await mkdtemp(join(tmpdir(), "archive-404-home-"));
  const outDir = pathToFileURL(`${outputDirectory}${sep}`);

  await build({
    root: workspaceRoot,
    outDir: outputDirectory,
    logLevel: "silent",
  });

  pageHtml = await Bun.file(new URL("./index.html", outDir)).text();
  const stylesheetFiles = [
    ...new Bun.Glob("**/*.css").scanSync({
      cwd: outputDirectory,
      onlyFiles: true,
    }),
  ];

  if (stylesheetFiles.length !== 1) {
    throw new Error(`Expected one generated stylesheet, received ${stylesheetFiles.length}`);
  }

  pageCss = await Bun.file(join(outputDirectory, stylesheetFiles[0]!)).text();
});

afterAll(async () => {
  if (outputDirectory) {
    await rm(outputDirectory, { force: true, recursive: true });
  }
});

describe("generated home page", () => {
  test("renders one archival H1 and the required semantic section order", () => {
    const headings = [...pageHtml.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];
    const sectionIds = [
      ...pageHtml.matchAll(/<section\b[^>]*\bid="([^"]+)"[^>]*>/g),
    ].map((match) => match[1]);

    expect(headings).toHaveLength(1);
    expect(visibleText(headings[0]?.[1] ?? "")).toBe("АРХИВ №404");
    expect(sectionIds.filter((id) => expectedSectionOrder.includes(id as never))).toEqual(
      [...expectedSectionOrder],
    );
  });

  test("connects navigation and both CTAs to real page destinations", () => {
    const navigation = pageHtml.match(
      /<nav\b[^>]*aria-label="Основная навигация"[^>]*>([\s\S]*?)<\/nav>/,
    )?.[1];
    const primaryCta = pageHtml.match(
      /<a\b(?=[^>]*\bclass="[^"]*primary-cta\b[^"]*")(?=[^>]*\bhref="#contact")[^>]*>([\s\S]*?)<\/a>/,
    );
    const secondaryCta = pageHtml.match(
      /<a\b(?=[^>]*\bclass="[^"]*secondary-cta\b[^"]*")(?=[^>]*\bhref="#projects")[^>]*>([\s\S]*?)<\/a>/,
    );

    expect(navigation).toBeDefined();
    for (const target of expectedNavTargets) {
      expect(navigation).toContain(`href="${target}"`);
    }
    expect(primaryCta).not.toBeNull();
    expect(visibleText(primaryCta?.[1] ?? "")).toBe(siteData.cta.primary);
    expect(secondaryCta).not.toBeNull();
    expect(visibleText(secondaryCta?.[1] ?? "")).toBe(siteData.cta.secondary);
  });

  test("renders complete navigation inside native mobile details", () => {
    const mobileDetails = pageHtml.match(
      /<details\b(?=[^>]*\bclass="[^"]*mobile-nav\b[^"]*")[^>]*>([\s\S]*?)<\/details>/,
    )?.[1];
    const mobileNavigation = mobileDetails?.match(
      /<nav\b[^>]*aria-label="Мобильная навигация"[^>]*>([\s\S]*?)<\/nav>/,
    )?.[1];

    expect(mobileDetails).toContain("<summary>");
    expect(mobileNavigation).toBeDefined();
    for (const target of expectedNavTargets) {
      expect(mobileNavigation).toContain(`href="${target}"`);
    }
  });

  test("renders the project disclosure as usable native details", () => {
    const project = pageHtml.match(
      /<article\b[^>]*data-project-id="archive-404"[^>]*>([\s\S]*?)<\/article>/,
    )?.[1];
    const projectDetails = project?.match(
      /<details\b(?=[^>]*\bclass="[^"]*project-record__details\b[^"]*")[^>]*>([\s\S]*?)<\/details>/,
    )?.[1];
    const summary = projectDetails?.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/)?.[1];

    expect(projectDetails).toBeDefined();
    expect(visibleText(summary ?? "")).toBe("ОТКРЫТЬ АРХИВНУЮ ЗАПИСЬ");
    expect(visibleText(projectDetails ?? "")).toContain("ЗАДАЧА");
    expect(visibleText(projectDetails ?? "")).toContain("РЕШЕНИЕ");
    expect(visibleText(projectDetails ?? "")).toContain("РЕЗУЛЬТАТ");
  });

  test("keeps IDs unique and resolves every local fragment link", () => {
    const ids = [...pageHtml.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]!);
    const fragmentTargets = [...pageHtml.matchAll(/\bhref="#([^"]+)"/g)].map(
      (match) => decodeURIComponent(match[1]!),
    );
    const idSet = new Set(ids);

    expect(idSet.size).toBe(ids.length);
    for (const target of fragmentTargets) {
      expect(idSet.has(target), `Missing fragment target #${target}`).toBe(true);
    }
  });

  test("includes the skip link and remains static without mandatory scripts", () => {
    const skipLink = pageHtml.match(
      /<a\b(?=[^>]*\bclass="[^"]*skip-link\b[^"]*")(?=[^>]*\bhref="#main-content")[^>]*>([\s\S]*?)<\/a>/,
    );

    expect(visibleText(skipLink?.[1] ?? "")).toBe("Перейти к содержанию");
    expect(pageHtml).not.toMatch(/<script\b/);
  });

  test("ships a reduced-motion stylesheet override", () => {
    expect(pageCss).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });

  test("keeps technology numbers upright inside rotated badges", () => {
    const technologyNumbers = [
      ...pageHtml.matchAll(
        /<span\b[^>]*class="technology-list__glyph"[^>]*>\s*<span>(\d{2})<\/span>\s*<\/span>/g,
      ),
    ].map((match) => match[1]);

    expect(technologyNumbers).toEqual(
      siteData.technologies.map((_, index) => String(index + 1).padStart(2, "0")),
    );
  });

  test("renders the single truthful work-in-progress project", () => {
    expect(pageHtml.match(/data-project-id="archive-404"/g)).toHaveLength(1);

    const project = pageHtml.match(
      /<article\b[^>]*data-project-id="archive-404"[^>]*>([\s\S]*?)<\/article>/,
    )?.[1];

    expect(project).toBeDefined();
    expect(visibleText(project ?? "")).toContain("Архив №404");
    expect(visibleText(project ?? "")).toContain("В разработке");
  });

  test("does not invent contact hrefs when contact data is null", () => {
    const archivedContact = pageHtml.match(
      /<div\b(?=[^>]*\bclass="[^"]*contact-archived\b[^"]*")[^>]*>/,
    )?.[0];

    expect(siteData.email).toBeNull();
    expect(siteData.telegram).toBeNull();
    expect(archivedContact).toBeDefined();
    expect(archivedContact).not.toMatch(/\brole=/);
    expect(pageHtml).not.toContain('href="mailto:');
    expect(pageHtml).not.toContain('href="https://t.me/');
  });
});
