# Astro/Bun Content Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a strict, static Astro foundation with Bun 1.3.14, validated Russian site data, one truthful project, and test-first coverage for the data behavior.

**Architecture:** Astro owns the static page and content-collection registration. Plain TypeScript modules own Zod schemas plus the two behaviors the future UI will need: contact-link omission and deterministic project ordering. Bun's native test runner exercises the real JSON and TypeScript modules without mocks.

**Tech Stack:** Astro, TypeScript strict mode, Bun 1.3.14, Zod, `@astrojs/check`.

---

### Task 1: Test and package foundation

**Files:**
- Create: `package.json`
- Create: `tests/site-data.test.ts`
- Create: `tests/projects.test.ts`

- [ ] **Step 1: Declare the Bun scripts and write behavior tests before production modules**

Create a private ESM package with `packageManager: "bun@1.3.14"` and scripts `dev`, `build`, `preview`, `check`, and `test`. Tests must first assert that the future real modules/files exist, then validate:

```ts
expect(siteDataSchema.parse(siteData)).toEqual(siteData);
expect(getContactLinks({ email: null, telegram: " " })).toEqual([]);
expect(projectFiles).toEqual(["archive-404.json"]);
expect(projectSchema.parse(project).status).toBe("В разработке");
expect(sortProjects(input).map(({ id }) => id)).toEqual(expectedIds);
```

- [ ] **Step 2: Run the tests to verify RED**

Run: `npx --yes bun@1.3.14 test`

Expected: FAIL because `src/data/site.ts` and `src/lib/projects.ts` do not exist yet.

### Task 2: Install the pinned Bun-managed toolchain

**Files:**
- Modify: `package.json`
- Create: `bun.lock`

- [ ] **Step 1: Install runtime and development dependencies**

Run: `npx --yes bun@1.3.14 add zod`

Run: `npx --yes bun@1.3.14 add --dev astro @astrojs/check typescript`

Expected: both commands exit 0 and Bun writes a real text `bun.lock`.

### Task 3: Implement the typed content model minimally

**Files:**
- Create: `src/data/site.json`
- Create: `src/data/site.ts`
- Create: `src/lib/projects.ts`
- Create: `src/content/projects/archive-404.json`
- Create: `src/content.config.ts`

- [ ] **Step 1: Add validated common site data and safe contact links**

Define a strict Zod schema containing `name`, `role`, `description`, nullable-or-empty `email` and `telegram`, non-empty `services` and `technologies`, CTA labels, and SEO title/description. Parse the JSON at module load. `getContactLinks()` returns no entries for null/blank fields and creates only fixed `mailto:` or `https://t.me/` links for present values.

- [ ] **Step 2: Add the project schema and ordering helper**

Define all requested project fields in one strict Zod schema. `image` is optional. `sortProjects()` copies its input and orders featured projects first, then newer years, then Russian titles for deterministic output.

- [ ] **Step 3: Add exactly one truthful project**

Add only `archive-404.json`: title `Архив №404`, client type `Личный бренд`, status `В разработке`, current stack, and an explicit statement that final results have not yet been established. Omit `image` and all metrics.

- [ ] **Step 4: Register the Astro collection**

Use Astro's glob loader over `src/content/projects/*.json` and the shared `projectSchema`, exporting only the `projects` collection.

- [ ] **Step 5: Run tests to verify GREEN**

Run: `npx --yes bun@1.3.14 test`

Expected: all tests pass with zero failures.

### Task 4: Add the strict static Astro scaffold

**Files:**
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `src/env.d.ts`
- Create: `src/pages/index.astro`
- Create: `.gitignore`

- [ ] **Step 1: Configure static output and strict TypeScript**

Set `output: "static"`, extend `astro/tsconfigs/strict`, and include `.astro/types.d.ts`, source files, and tests.

- [ ] **Step 2: Add only a minimal buildable page**

Render the validated SEO title plus a short `Сайт в разработке.` message. Add no full visual system, client framework, error pages, or deployment configuration.

- [ ] **Step 3: Ignore generated and local-only files**

Ignore `node_modules`, `dist`, `.astro`, coverage output, logs, OS metadata, and local environment files while allowing an example env file.

### Task 5: Documentation and verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Document the wrapper commands**

Explain that Bun is invoked through `npx --yes bun@1.3.14`, and list install, dev, test, check, build, and preview commands.

- [ ] **Step 2: Run fresh full verification**

Run: `npx --yes bun@1.3.14 test`

Run: `npx --yes bun@1.3.14 run check`

Run: `npx --yes bun@1.3.14 run build`

Expected: all commands exit 0; tests have zero failures; Astro check has zero errors; build emits static files to `dist/`.

- [ ] **Step 3: Self-review scope and repository changes**

Confirm there is exactly one project, contacts are null/empty-safe, no fake claims or metrics were added, no client framework or out-of-scope UI/deployment work exists, the accepted staged specification is unchanged, and no commit was created.
