import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = fileURLToPath(new URL("../", import.meta.url));

let outputDirectory = "";
let pageHtml = "";

beforeAll(async () => {
  outputDirectory = await mkdtemp(join(tmpdir(), "archive-404-base-path-"));
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
      SITE_URL: "https://example.invalid",
      BASE_PATH: "/sample-repo",
      FORCE_COLOR: "0",
    },
    stdout: "ignore",
    stderr: "pipe",
  });
  const buildError = await new Response(buildProcess.stderr).text();

  expect(await buildProcess.exited, buildError).toBe(0);
  pageHtml = await Bun.file(join(outputDirectory, "index.html")).text();
});

afterAll(async () => {
  if (outputDirectory) {
    await rm(outputDirectory, { force: true, recursive: true });
  }
});

describe("environment-driven Astro base path", () => {
  test("prefixes the generated stylesheet URL with BASE_PATH", () => {
    const stylesheetHref = pageHtml.match(
      /<link\b(?=[^>]*\brel="stylesheet")(?=[^>]*\bhref="([^"]+)")[^>]*>/,
    )?.[1];

    expect(stylesheetHref).toMatch(/^\/sample-repo\/_astro\/.+\.css$/);
  });
});
