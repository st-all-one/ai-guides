---
name: playwright-ts-admin
description: >
  Playwright in TypeScript (@playwright/test) for end-to-end UI/API tests,
  focused on admin webapps (CRUD, tables, modals, auth, filters). Locator
  hierarchy, auth/isolation patterns, web-first assertions, debugging, CI.
  Load when writing, reviewing, or debugging Playwright tests.
category: tooling
version: "1.x"
tags: [playwright, testing, e2e, typescript, locators, admin, ci, accessibility]
license: MIT
---

# Playwright + TypeScript (admin scenarios)

## Use When
- Automating UI flows (login, CRUD, tables, modals, upload, navigation)
- Regression tests for admin apps
- API tests (`APIRequestContext`), network mocking, reusable auth
- Cross-browser/CI test execution

## Avoid When
- Unit tests → Vitest/Jest
- Pure performance benchmarks
- No accessible DOM → use the Playwright Library directly

## Core Rules
- **Locator hierarchy (in order):** `getByRole` → `getByLabel` → `getByPlaceholder` → `getByText` → `getByTestId` → CSS/XPath (last resort).
- Never use brittle CSS tied to structure; prefer roles and accessible names.
- Use **web-first assertions** (`expect(locator).toBeVisible()`) with auto-retry; no manual sleeps.
- Authenticate once, reuse via `storageState` (`use: { storageState }`) or a setup project.
- Isolate tests: fresh context per test; independent data.
- Prefer fixtures for page objects and typed test data.
- Configure `projects` for browsers; `retries` only in CI; traces on first retry.
- Use `test.step()` for readable reports; `expect.soft` for non-blocking assertions.
- Mock network with `page.route()`; assert requests/responses via `waitForResponse`.
- Enable trace/screenshot/video on failure, not always.

## Core Patterns
```ts
import { test, expect } from "@playwright/test";

test.describe("Users admin", () => {
  test.beforeEach(async ({ page }) => { await page.goto("/admin/users"); });

  test("create user", async ({ page }) => {
    await page.getByRole("button", { name: "Novo" }).click();
    const dialog = page.getByRole("dialog", { name: "Novo usuário" });
    await dialog.getByLabel("Nome").fill("Ana");
    await dialog.getByLabel("E-mail").fill("ana@example.com");
    await dialog.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByRole("row", { name: /ana@example\.com/ })).toBeVisible();
  });

  test("filter table", async ({ page }) => {
    await page.getByPlaceholder("Buscar").fill("ana");
    await expect(page.getByRole("row")).toHaveCount(2); // header + match
  });
});

// Auth setup project → storageState
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "chromium", use: { storageState: "playwright/.auth/user.json" }, dependencies: ["setup"] },
  ],
  retries: process.env.CI ? 2 : 0,
  use: { trace: "on-first-retry" },
});
```

## File Map
| File | Content |
|---|---|
| `INDICE.md` | Full dossier index |
| `intro-js.md`, `writing-tests-js.md`, `running-tests-js.md` | Basics and execution |
| `locators.md`, `other-locators.md` | Locator strategies |
| `actionability.md`, `input.md`, `dialogs.md`, `downloads.md` | Interactions |
| `auth.md`, `browser-contexts.md` | Auth and isolation |
| `api-testing-js.md`, `mock.md`, `network.md` | API and network |
| `test-*.js.md` | Runner: fixtures, config, projects, retries, sharding, annotations, timeouts, reporters, snapshots, parameterize, ui-mode, use-options |
| `ci.md`, `ci-intro.md`, `docker.md`, `selenium-grid.md` | CI and grids |
| `trace-viewer.md`, `codegen.md`, `debug.md` | Tooling |
| `accessibility-testing-js.md`, `aria-snapshots.md` | A11y testing |
| `pom.md`, `pages.md`, `best-practices-js.md` | Architecture |
| `exemplos/` | Runnable admin examples |

## Read Order
`intro-js.md`→`locators.md`→`writing-tests-js.md`; auth `auth.md`; runner `test-configuration-js.md`; CI `ci.md`.

## Prereqs
Node.js/TypeScript; `@playwright/test` installed with browsers.
