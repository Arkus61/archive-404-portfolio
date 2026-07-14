# Task 1 Code-Quality Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tighten Telegram validation, make project ordering fully deterministic, and guarantee Astro entry IDs come from required project data while preserving recursive collection coverage.

**Architecture:** Existing Zod schemas remain the public data contracts. The Astro glob loader receives a `generateId` function backed by the project ID schema, while a loader-level integration test exercises the real configured loader against a nested temporary JSON entry. No production project fixtures or UI are added.

**Tech Stack:** Astro 7, TypeScript strict mode, Zod 4, Bun 1.3.14 test runner.

---

### Task 1: Canonical Telegram usernames

**Files:**
- Modify: `tests/site-data.test.ts`
- Modify: `src/data/site.ts`

- [ ] **Step 1: Add failing contract tests**

Test that `example_user` and `@example_user` parse to `example_user`, that links become `https://t.me/example_user`, and that URLs, whitespace, duplicate `@`, slashes, Cyrillic, dots, and dashes fail validation.

- [ ] **Step 2: Verify targeted RED**

Run: `npx --yes bun@1.3.14 test tests/site-data.test.ts`

Expected: FAIL because the current schema trims and accepts every non-empty Telegram string and does not normalize its output.

- [ ] **Step 3: Implement the minimal schema transform**

Use a single branch matching `/^@?[A-Za-z0-9_]+$/`, transform an optional leading `@` away, and preserve `null`/empty values.

- [ ] **Step 4: Verify targeted GREEN**

Run: `npx --yes bun@1.3.14 test tests/site-data.test.ts`

Expected: all site-data tests pass.

### Task 2: Total project ordering

**Files:**
- Modify: `tests/projects.test.ts`
- Modify: `src/lib/projects.ts`

- [ ] **Step 1: Add a failing exact-tie test**

Create two valid projects with the same `featured`, `year`, and Russian `title`, place the greater ID first, and expect ascending ID order.

- [ ] **Step 2: Verify targeted RED**

Run: `npx --yes bun@1.3.14 test tests/projects.test.ts --test-name-pattern "unique id"`

Expected: FAIL because the current comparator returns zero and preserves reversed input.

- [ ] **Step 3: Add the final ID comparator**

After title comparison, compare IDs lexically so distinct valid IDs always have a deterministic order.

- [ ] **Step 4: Verify targeted GREEN**

Run the same targeted command and expect PASS.

### Task 3: Data-owned Astro entry IDs and recursive scope

**Files:**
- Modify: `tests/projects.test.ts`
- Modify: `src/lib/projects.ts`
- Modify: `src/content.config.ts`

- [ ] **Step 1: Align the production scan assertion**

Change the exact-one-project test glob from `*.json` to `**/*.json`, matching the configured loader scope.

- [ ] **Step 2: Add a failing loader integration test**

Run the actual `collections.projects.loader` against a nested temporary `mismatched-file.json` containing the real project data and assert the stored entry key and `data.id` are both `archive-404`.

- [ ] **Step 3: Verify integration RED**

Run: `npx --yes bun@1.3.14 test tests/projects.test.ts --test-name-pattern "loader entry ID"`

Expected: FAIL because Astro currently derives the entry ID from `nested/mismatched-file.json`.

- [ ] **Step 4: Configure `generateId` from required data**

Add a focused `projectIdFromData(data)` helper that validates `data.id` with the existing project ID schema, and pass it to the glob loader as `generateId`.

- [ ] **Step 5: Verify project GREEN**

Run: `npx --yes bun@1.3.14 test tests/projects.test.ts`

Expected: all project tests pass.

### Task 4: Full verification and review

**Files:**
- Review: all changed source and test files

- [ ] **Step 1: Run fresh verification**

Run:

```powershell
npx --yes bun@1.3.14 test
npx --yes bun@1.3.14 run check
npx --yes bun@1.3.14 run build
npx --yes bun@1.3.14 audit
```

The audit command is included only if Bun 1.3.14 exposes it. Tests must have zero failures, Astro check zero diagnostics, and build must remain static.

- [ ] **Step 2: Self-review the requirements**

Confirm malformed Telegram inputs fail, tie ordering is independent of input order, the configured loader stores `data.id` as entry ID for nested files, production/test globs are both recursive, exactly one truthful project remains, and no commit was created.
