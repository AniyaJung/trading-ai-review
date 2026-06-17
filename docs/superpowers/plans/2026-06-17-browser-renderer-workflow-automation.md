# Browser Renderer Workflow Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first browser-level renderer workflow regression test without involving Electron packaging or real local data.

**Architecture:** Use Playwright against the Vite browser preview. The test should interact with the real rendered app through accessible roles and assert that desktop-only backup/settings actions stay disabled in preview mode.

**Tech Stack:** Playwright, Vite, React, Vitest.

---

### Task 1: Add Playwright Preview Workflow Coverage

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/backup-settings-preview.e2e.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`
- Modify: `docs/superpowers/2026-06-12-architecture-optimization-backlog.md`

- [x] **Step 1: Add Playwright dependency**

Run:

```bash
npm install -D @playwright/test
```

- [x] **Step 2: Add the test script**

Add this script to `package.json`:

```json
"test:e2e": "playwright test"
```

- [x] **Step 3: Add Playwright config**

Create `playwright.config.ts` that starts `npm run web:dev`, uses `http://127.0.0.1:5173` as the base URL, and runs Chromium only.

- [x] **Step 4: Add backup/settings preview tests**

Create `e2e/backup-settings-preview.e2e.ts` with tests that:

- open the app in browser preview mode;
- click the backup navigation item and verify backup/restore/directory actions are disabled;
- click the settings navigation item and verify save/reset/directory actions are disabled.

- [x] **Step 5: Verify**

Run:

```bash
npm run test:e2e
npm run build
npm run lint
npm run test -- --run
git diff --check
```

Expected: all commands exit successfully.

- [x] **Step 6: Commit**

```bash
git add .gitignore package.json package-lock.json playwright.config.ts e2e/backup-settings-preview.e2e.ts docs/superpowers/2026-06-12-architecture-optimization-backlog.md docs/superpowers/plans/2026-06-17-browser-renderer-workflow-automation.md
git commit -m "test: add browser preview workflow coverage"
```
