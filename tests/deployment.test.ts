import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = fileURLToPath(new URL("../", import.meta.url));
const workflowUrl = new URL("../.github/workflows/deploy.yml", import.meta.url);
const readmeUrl = new URL("../README.md", import.meta.url);

interface WorkflowStep {
  name?: string;
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
}

interface WorkflowJob {
  environment?: { name?: string; url?: string };
  needs?: string;
  permissions?: Record<string, string>;
  "runs-on"?: string;
  steps?: WorkflowStep[];
}

interface DeployWorkflow {
  concurrency?: { group?: string; "cancel-in-progress"?: boolean };
  jobs?: { build?: WorkflowJob; deploy?: WorkflowJob };
  on?: { push?: { branches?: string[] }; workflow_dispatch?: unknown };
  permissions?: Record<string, string>;
}

async function runBuildWithEnvironment(
  environment: Record<string, string>,
): Promise<{ exitCode: number; indexHtml: string; output: string }> {
  const outputDirectory = await mkdtemp(
    join(tmpdir(), "archive-404-invalid-config-"),
  );
  const buildScript = `
    import { build } from "astro";
    await build({
      root: ${JSON.stringify(workspaceRoot)},
      outDir: ${JSON.stringify(outputDirectory)},
      logLevel: "silent",
    });
  `;

  try {
    const buildProcess = Bun.spawn({
      cmd: [process.execPath, "--eval", buildScript],
      cwd: workspaceRoot,
      env: {
        ...process.env,
        ...environment,
        FORCE_COLOR: "0",
      },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(buildProcess.stdout).text(),
      new Response(buildProcess.stderr).text(),
      buildProcess.exited,
    ]);
    const indexFile = Bun.file(join(outputDirectory, "index.html"));
    const indexHtml =
      exitCode === 0 && (await indexFile.exists()) ? await indexFile.text() : "";

    return { exitCode, indexHtml, output: `${stdout}\n${stderr}` };
  } finally {
    await rm(outputDirectory, { force: true, recursive: true });
  }
}

describe("deployment configuration", () => {
  test.each([
    {
      name: "SITE_URL",
      environment: { SITE_URL: "not-a-url", BASE_PATH: "/" },
      error: "Invalid SITE_URL",
    },
    {
      name: "BASE_PATH",
      environment: {
        SITE_URL: "https://example.github.io",
        BASE_PATH: "../sample-repo",
      },
      error: "Invalid BASE_PATH",
    },
    {
      name: "BASE_PATH with surrounding whitespace",
      environment: {
        SITE_URL: "https://example.github.io",
        BASE_PATH: " /sample-repo ",
      },
      error: "Invalid BASE_PATH",
    },
    {
      name: "root BASE_PATH with surrounding whitespace",
      environment: {
        SITE_URL: "https://example.github.io",
        BASE_PATH: " / ",
      },
      error: "Invalid BASE_PATH",
    },
  ])("rejects malformed $name instead of silently using a default", async (fixture) => {
    const result = await runBuildWithEnvironment(fixture.environment);

    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain(fixture.error);
  });

  test.each([
    "https://example.github.io/sample-repo/..",
    "https://example.github.io?",
    "https://example.github.io#",
  ])("rejects SITE_URL input hidden by URL normalization: %s", async (siteUrl) => {
    const result = await runBuildWithEnvironment({
      SITE_URL: siteUrl,
      BASE_PATH: "/",
    });

    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain("Invalid SITE_URL");
  });

  test.each([
    "HTTPS://Example.GitHub.IO",
    "HtTpS://EXAMPLE.GITHUB.IO/",
  ])("accepts mixed-case SITE_URL and emits its canonical origin: %s", async (siteUrl) => {
    const result = await runBuildWithEnvironment({
      SITE_URL: siteUrl,
      BASE_PATH: "/",
    });

    expect(result.exitCode, result.output).toBe(0);
    expect(result.indexHtml).toContain(
      '<link rel="canonical" href="https://example.github.io/">',
    );
  });

  test("defines least-privilege Bun and GitHub Pages jobs as semantic YAML", async () => {
    expect(
      await Bun.file(workflowUrl).exists(),
      ".github/workflows/deploy.yml must exist",
    ).toBe(true);

    const workflow = Bun.YAML.parse(
      await Bun.file(workflowUrl).text(),
    ) as DeployWorkflow;
    const build = workflow.jobs?.build;
    const deploy = workflow.jobs?.deploy;

    expect(workflow.on?.push?.branches).toEqual(["main"]);
    expect(
      workflow.on && "workflow_dispatch" in workflow.on,
    ).toBe(true);
    expect(workflow.concurrency).toEqual({
      group: "pages",
      "cancel-in-progress": true,
    });
    expect(workflow.permissions).toBeUndefined();
    expect(build?.permissions).toEqual({ contents: "read" });
    expect(deploy?.permissions).toEqual({
      pages: "write",
      "id-token": "write",
    });
    expect(build?.["runs-on"]).toBe("ubuntu-latest");
    expect(deploy?.["runs-on"]).toBe("ubuntu-latest");
    expect(deploy?.needs).toBe("build");
    expect(deploy?.environment?.name).toBe("github-pages");

    const buildSteps = build?.steps ?? [];
    const deploySteps = deploy?.steps ?? [];
    const buildActions = buildSteps.flatMap(({ uses }) => (uses ? [uses] : []));
    const deployActions = deploySteps.flatMap(({ uses }) => (uses ? [uses] : []));

    expect(buildActions).toEqual([
      "actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10",
      "oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6",
      "actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9",
    ]);
    expect(deployActions).toEqual([
      "actions/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d",
      "actions/deploy-pages@cd2ce8fcbc39b97be8ca5fce6e763baed58fa128",
    ]);
    expect(
      [...buildActions, ...deployActions].every((action) =>
        /@[0-9a-f]{40}$/.test(action),
      ),
    ).toBe(true);
    expect(
      buildSteps.find(({ name }) => name === "Set up Bun")?.with?.["bun-version"],
    ).toBe("1.3.14");
    expect(
      buildSteps.find(
        ({ name }) => name === "Upload GitHub Pages artifact",
      )?.with?.path,
    ).toBe("./dist");

    for (const command of [
      "bun install --frozen-lockfile",
      "bun test",
      "bun run check",
      "bun run build",
    ]) {
      expect(buildSteps.some(({ run }) => run === command)).toBe(true);
    }

    const computeScript = buildSteps.find(
      ({ name }) => name === "Compute GitHub Pages URLs",
    )?.run;

    expect(computeScript).toContain('owner="${GITHUB_REPOSITORY_OWNER,,}"');
    expect(computeScript).toContain('repo="${GITHUB_REPOSITORY#*/}"');
    expect(computeScript).toContain(
      'if [[ "${repo,,}" == "${owner}.github.io" ]]',
    );
    expect(computeScript).toContain(
      'SITE_URL=https://${owner}.github.io',
    );
  });

  test("documents content, nullable contacts, environment examples, and Pages setup", async () => {
    const readme = await Bun.file(readmeUrl).text();

    expect(readme).not.toContain("будет реализован в следующей задаче");
    expect(readme).toContain("npx --yes bun@1.3.14");
    expect(readme).toContain("src/data/site.json");
    expect(readme).toContain("src/content/projects");
    expect(readme).toMatch(/email.*null/is);
    expect(readme).toMatch(/telegram.*null/is);
    expect(readme).toContain("SITE_URL");
    expect(readme).toContain("BASE_PATH");
    expect(readme).toContain("https://example.github.io");
    expect(readme).toContain("/sample-repo");
    expect(readme).toContain("GitHub Pages");
    expect(readme).toContain("/maintenance/");
    expect(readme).toContain("origin-root `/robots.txt`");
    expect(readme).toContain("`/repository/sitemap-index.xml`");
    expect(readme).toContain("Search Console");
    expect(readme).toContain("Вебмастер");
    expect(readme).toMatch(/корневой пользовательский сайт.*собственный домен/is);
  });
});
