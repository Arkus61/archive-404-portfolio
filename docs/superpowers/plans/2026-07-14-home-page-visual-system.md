# Astro Portfolio Home Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder with a production-ready static Astro home page that faithfully translates the accepted 1680×941 archive reference while rendering only truthful typed site and project content.

**Architecture:** `index.astro` composes focused server-rendered Astro components inside a reusable SEO layout. `siteData`, `getContactLinks`, `getCollection("projects")`, and `sortProjects` are the only public-content sources; one global stylesheet owns the paper, grid, type, color, responsive, focus, and motion systems. Native `details` provides mobile navigation and project expansion without client JavaScript.

**Tech Stack:** Astro 7, TypeScript 6, Bun test, semantic HTML, CSS, reusable inline SVG components.

**Execution note:** Commit steps are omitted because the user explicitly requested no commit and the repository has no configured author identity.

---

### Task 1: Generated-HTML contract — RED

**Files:**
- Create: `tests/home-page.test.ts`

- [ ] Build the actual Astro site into a temporary directory once for the test file.
- [ ] Assert the generated page has exactly one `<h1>` with `АРХИВ №404`.
- [ ] Assert semantic sections `hero`, `projects`, `services`, `technologies`, `process`, `about`, and `contact` exist in that order.
- [ ] Assert header navigation links target `#about`, `#services`, `#projects`, `#process`, `#technologies`, and `#contact`.
- [ ] Assert the primary CTA text resolves to `siteData.cta.primary` and its destination is `#contact`.
- [ ] Assert exactly one project record is rendered with `data-project-id="archive-404"`, title `Архив №404`, and status `В разработке`.
- [ ] Assert null contacts generate no `mailto:` or `https://t.me/` href.
- [ ] Run `npx --yes bun@1.3.14 test tests/home-page.test.ts` and retain the expected assertion failure caused by the placeholder page.

### Task 2: Reusable page shell and technical chrome

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/components/Header.astro`
- Create: `src/components/TechnicalRails.astro`
- Create: `src/components/icons/TechnicalIcon.astro`
- Create: `src/styles/global.css`

- [ ] Implement `BaseLayout` with `lang="ru"`, UTF-8, responsive viewport, title/description props, canonical color metadata, global stylesheet import, skip link, and a static page shell.
- [ ] Implement desktop header navigation and a native `<details>` mobile menu using the same six section destinations.
- [ ] Render the current `СИСТЕМА: НОРМА` copy as progressively enhanced CSS text reveal while leaving the full text in HTML.
- [ ] Implement left and right archival rails as `aria-hidden` ornaments; hide their dense metadata below desktop and reserve no overflowing width on mobile.
- [ ] Implement a small named icon component whose supported names cover arrows, idea, design, code, launch, mail, telegram, and globe with decorative SVG hidden from assistive technology.
- [ ] Establish CSS tokens for cream paper, graphite, muted orange, turquoise, faded red, thin graphite rules, sharp corners, compact technical type, focus rings, paper grain, and reduced-motion overrides.

### Task 3: First viewport and dossier

**Files:**
- Create: `src/components/Hero.astro`
- Create: `src/components/SpecialistDossier.astro`
- Create: `src/components/Blueprint.astro`

- [ ] Render `#hero` with one H1 `АРХИВ №404`, subtitle `БЮРО ЦИФРОВЫХ КОНСТРУКЦИЙ`, orange service title `САЙТЫ ПОД КЛЮЧ`, exact `siteData.description`, and primary CTA to `#contact`.
- [ ] Render the dossier heading `ЛИЧНОЕ ДЕЛО СПЕЦИАЛИСТА`, specialist serial `404-DEV-01`, truthful role, `ВЕБ-РАЗРАБОТКА ПОД КЛЮЧ`, and APPROVED visual stamp.
- [ ] Build the required code-native blueprint SVG as a technical web-system plan using labeled browser frames, node connections, dimension lines, crosshairs, and reference-grid patterns rather than a traced raster object.
- [ ] Keep the hero two-column and close to the reference proportions at 1280–1680 px, stack it cleanly at tablet/mobile widths, and avoid horizontal overflow at 320 px.

### Task 4: Archive, services, technologies, and process

**Files:**
- Create: `src/components/ProjectArchive.astro`
- Create: `src/components/Capabilities.astro`
- Create: `src/components/Process.astro`

- [ ] Render only the sorted Astro collection entry in `#projects`; expose summary immediately and task/solution/result through native `<details>`.
- [ ] Use `data-project-id={project.id}` and show its truthful `status`, `category`, `clientType`, `year`, and stack without metrics, client claims, launch dates, or images.
- [ ] Render `siteData.services` in `#services` and `siteData.technologies` in `#technologies`, using editorial rows and technical numbering instead of rounded cards.
- [ ] Render `#process` in exact sequence IDEA → DESIGN → CODE → LAUNCH with concise truthful descriptions, connected by thin directional rules.
- [ ] Add hover/focus-visible states and subtle CSS marker motion while leaving all content present without animation support.

### Task 5: About and truthful contact state

**Files:**
- Create: `src/components/AboutContact.astro`

- [ ] Render `#about` with `siteData.name`, `siteData.role`, and the current description without invented biography, tenure, or metrics.
- [ ] Render `#contact` from `getContactLinks(siteData)` when links exist.
- [ ] When links are absent, render the archived-state message `КАНАЛЫ СВЯЗИ ЕЩЁ НЕ РАССЕКРЕЧЕНЫ` and no anchor with an empty, `mailto:`, or Telegram href.
- [ ] Keep the primary CTA’s `#contact` destination valid in the null-contact state.

### Task 6: GREEN and production verification

**Files:**
- Modify only if a failing check exposes a legitimate integration issue in the files above.

- [ ] Run `npx --yes bun@1.3.14 test tests/home-page.test.ts`; expect all home-page assertions to pass.
- [ ] Run `npx --yes bun@1.3.14 test`; expect the complete suite to pass.
- [ ] Run `npx --yes bun@1.3.14 run check`; expect zero Astro/TypeScript errors.
- [ ] Run `npx --yes bun@1.3.14 run build`; expect a static `dist/index.html` build.

### Task 7: Responsive visual and interaction QA

**Files:**
- Create: `design-qa.md`
- Modify: relevant component/CSS files only when the rendered comparison identifies P0/P1/P2 issues.

- [ ] Open the source reference and capture the implementation at 1680×941 in the in-app browser.
- [ ] Compare source and implementation together for typography, proportions, grid/rules, colors, blueprint fidelity, content density, and exact visible copy.
- [ ] Inspect 320, 375, 768, 1280, 1440, and 1680 widths for overflow and readable stacking.
- [ ] Exercise mobile navigation, project details, navigation anchors, CTA, focus states, and reduced-motion behavior; inspect browser console errors.
- [ ] Fix P0/P1/P2 findings, recapture, and repeat until `design-qa.md` records `final result: passed`; leave only clearly documented P3 or intentional truthful-content deviations.
- [ ] Review file sizes and split any component that has lost a single clear responsibility.
