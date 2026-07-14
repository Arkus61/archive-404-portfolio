import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "astro";
import sharp from "sharp";

const projectModuleUrl = new URL("../src/lib/projects.ts", import.meta.url);
const contentConfigUrl = new URL("../src/content.config.ts", import.meta.url);
const projectArchiveUrl = new URL(
  "../src/components/ProjectArchive.astro",
  import.meta.url,
);
const workspaceRoot = fileURLToPath(new URL("../", import.meta.url));
const projectFileUrl = new URL(
  "../src/content/projects/archive-404.md",
  import.meta.url,
);

async function readProjectFrontmatter(): Promise<unknown> {
  const source = await Bun.file(projectFileUrl).text();
  const frontmatter = /^---\s*\r?\n([\s\S]*?)\r?\n---/.exec(source)?.[1];

  if (!frontmatter) {
    throw new Error("archive-404.md must contain YAML frontmatter");
  }

  return Bun.YAML.parse(frontmatter);
}

async function loadProjectModule(): Promise<typeof import("../src/lib/projects")> {
  expect(
    await Bun.file(projectModuleUrl).exists(),
    "src/lib/projects.ts must implement the typed project contract",
  ).toBe(true);

  return import(projectModuleUrl.href);
}

describe("project content", () => {
  test("contains exactly the truthful Архив №404 work in progress", async () => {
    expect(
      await Bun.file(projectFileUrl).exists(),
      "the real Архив №404 project entry must exist",
    ).toBe(true);

    const projectDirectory = fileURLToPath(
      new URL("../src/content/projects/", import.meta.url),
    );
    const projectFiles = [
      ...new Bun.Glob("**/*.md").scanSync({
        cwd: projectDirectory,
        onlyFiles: true,
      }),
    ].sort();
    const { projectSchema } = await loadProjectModule();
    const project = projectSchema.parse(await readProjectFrontmatter());

    expect(projectFiles).toEqual(["archive-404.md"]);
    expect(project).toMatchObject({
      id: "archive-404",
      title: "Архив №404",
      clientType: "Личный бренд",
      year: 2026,
      status: "В разработке",
      featured: true,
    });
    expect(project.result).toBe(
      "Проект находится в разработке; итоговые результаты ещё не подведены.",
    );
    expect(project.image).toBeUndefined();
  });

  test("orders featured work first, then by year, without mutating input", async () => {
    const { projectSchema, sortProjects } = await loadProjectModule();
    const baseProject = projectSchema.parse(await readProjectFrontmatter());
    const input = [
      {
        ...baseProject,
        id: "older-regular",
        title: "Бета",
        year: 2024,
        featured: false,
      },
      {
        ...baseProject,
        id: "newer-regular",
        title: "Альфа",
        year: 2025,
        featured: false,
      },
      {
        ...baseProject,
        id: "featured",
        title: "Гамма",
        year: 2023,
        featured: true,
      },
    ];
    const originalOrder = input.map(({ id }) => id);

    expect(sortProjects(input).map(({ id }) => id)).toEqual([
      "featured",
      "newer-regular",
      "older-regular",
    ]);
    expect(input.map(({ id }) => id)).toEqual(originalOrder);
  });

  test("uses unique id as the final tie-breaker for exact Russian-title ties", async () => {
    const { projectSchema, sortProjects } = await loadProjectModule();
    const baseProject = projectSchema.parse(await readProjectFrontmatter());
    const input = [
      {
        ...baseProject,
        id: "zeta-project",
        title: "Архив будущего",
      },
      {
        ...baseProject,
        id: "alpha-project",
        title: "Архив будущего",
      },
    ];

    expect(sortProjects(input).map(({ id }) => id)).toEqual([
      "alpha-project",
      "zeta-project",
    ]);
  });

  test("uses required data.id as the Astro loader entry ID for nested files", async () => {
    const temporaryRoot = await mkdtemp(
      `${workspaceRoot}${sep}.astro-content-test-`,
    );
    const temporaryRootUrl = pathToFileURL(`${temporaryRoot}${sep}`);
    const temporarySource = `${temporaryRoot}${sep}src`;
    const temporaryProjectDirectory = `${temporarySource}${sep}content${sep}projects${sep}nested`;
    const temporaryPagesDirectory = `${temporarySource}${sep}pages`;
    const actualContentConfig = fileURLToPath(
      new URL("../src/content.config.ts", import.meta.url),
    );
    const contentConfigImport = relative(
      temporarySource,
      actualContentConfig,
    ).replaceAll("\\", "/");

    try {
      await mkdir(temporaryProjectDirectory, { recursive: true });
      await mkdir(temporaryPagesDirectory, { recursive: true });
      await writeFile(
        `${temporaryProjectDirectory}${sep}mismatched-file.md`,
        await Bun.file(projectFileUrl).text(),
      );
      await writeFile(
        `${temporarySource}${sep}content.config.ts`,
        `export { collections } from ${JSON.stringify(contentConfigImport)};\n`,
      );
      await writeFile(
        `${temporaryPagesDirectory}${sep}index.astro`,
        `---
import { getCollection } from "astro:content";

const projects = await getCollection("projects");
const project = projects.at(0);

if (projects.length !== 1 || !project || project.id !== project.data.id) {
  throw new Error(
    \`Expected one project with matching loader/data IDs, received \${JSON.stringify(
      projects.map(({ id, data }) => ({ entryId: id, dataId: data.id })),
    )}\`,
  );
}
---

<!doctype html><title>Content invariant</title>
`,
      );

      await build({
        root: temporaryRoot,
        outDir: "./dist",
        logLevel: "silent",
      });

      expect(
        await Bun.file(new URL("./dist/index.html", temporaryRootUrl)).exists(),
      ).toBe(true);
    } finally {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test("prepares optional project images for responsive Astro optimization", async () => {
    const [contentConfig, projectArchive] = await Promise.all([
      Bun.file(contentConfigUrl).text(),
      Bun.file(projectArchiveUrl).text(),
    ]);

    expect(contentConfig).toContain("schema: ({ image }) =>");
    expect(contentConfig).toContain("image: image().optional()");
    expect(projectArchive).toContain('import { Picture } from "astro:assets"');
    expect(projectArchive).toContain('formats={["avif"]}');
    expect(projectArchive).toContain('fallbackFormat="webp"');
    expect(projectArchive).toContain("widths={[480, 720, 960]}");
    expect(projectArchive).toContain('loading="lazy"');
    expect(projectArchive).toContain("alt={projectImageAlt(project)}");
  });

  test("builds a local project image into responsive AVIF and WebP output", async () => {
    const temporaryRoot = await mkdtemp(
      join(workspaceRoot, ".astro-image-test-"),
    );
    const temporarySource = join(temporaryRoot, "src");
    const temporaryProjectDirectory = join(
      temporarySource,
      "content",
      "projects",
    );
    const temporaryPagesDirectory = join(temporarySource, "pages");
    const actualContentConfig = fileURLToPath(contentConfigUrl);
    const actualProjectArchive = fileURLToPath(projectArchiveUrl);
    const contentConfigImport = relative(
      temporarySource,
      actualContentConfig,
    ).replaceAll("\\", "/");
    const projectArchiveImport = relative(
      temporaryPagesDirectory,
      actualProjectArchive,
    ).replaceAll("\\", "/");
    const projectSource = (await Bun.file(projectFileUrl).text()).replace(
      /\r?\n---\s*$/,
      '\nimage: "./preview.png"\nimageAlt: "Тестовый чертёж проекта"\n---\n',
    );

    try {
      await mkdir(temporaryProjectDirectory, { recursive: true });
      await mkdir(temporaryPagesDirectory, { recursive: true });
      await sharp({
        create: {
          width: 960,
          height: 540,
          channels: 3,
          background: { r: 241, g: 236, b: 223 },
        },
      })
        .png()
        .toFile(join(temporaryProjectDirectory, "preview.png"));
      await writeFile(
        join(temporaryProjectDirectory, "archive-with-image.md"),
        projectSource,
      );
      await writeFile(
        join(temporarySource, "content.config.ts"),
        `export { collections } from ${JSON.stringify(contentConfigImport)};\n`,
      );
      await writeFile(
        join(temporaryPagesDirectory, "index.astro"),
        `---
import { getCollection } from "astro:content";
import ProjectArchive from ${JSON.stringify(projectArchiveImport)};

const projects = (await getCollection("projects")).map(({ data }) => data);
---

<!doctype html>
<html lang="ru"><body><ProjectArchive {projects} /></body></html>
`,
      );

      await build({
        root: temporaryRoot,
        outDir: "./dist",
        logLevel: "silent",
      });

      const html = await Bun.file(join(temporaryRoot, "dist", "index.html")).text();

      expect(html).toContain("<picture");
      expect(html).toContain('type="image/avif"');
      expect(html).toMatch(/src="[^"]+\.webp"/);
      expect(html).toContain("480w");
      expect(html).toContain("720w");
      expect(html).toContain("960w");
      expect(html).toContain('width="960"');
      expect(html).toContain('height="540"');
      expect(html).toContain('loading="lazy"');
      expect(html).toContain('alt="Тестовый чертёж проекта"');
    } finally {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });
});
