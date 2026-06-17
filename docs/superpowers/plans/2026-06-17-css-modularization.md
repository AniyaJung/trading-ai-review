# CSS Modularization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the first feature-specific CSS slice out of `src/App.css` without changing runtime behavior or class names.

**Architecture:** Keep `src/App.css` as the global app style entrypoint and import a focused feature stylesheet from `src/styles/backup-settings.css`. Move only backup/settings view rules and their responsive overrides so this remains a low-risk mechanical refactor.

**Tech Stack:** React, Vite, Electron, CSS, Vitest.

---

### Task 1: Extract Backup And Settings Styles

**Files:**
- Create: `src/styles/backup-settings.css`
- Modify: `src/App.css`
- Modify: `docs/superpowers/2026-06-12-architecture-optimization-backlog.md`

- [x] **Step 1: Create the feature stylesheet**

Move the `.backup-*`, `.settings-*`, and `.danger-zone` rules from `src/App.css` into `src/styles/backup-settings.css`. Preserve selectors and declarations exactly.

- [x] **Step 2: Import the stylesheet from the app CSS entrypoint**

Add this import at the top of `src/App.css`:

```css
@import "./styles/backup-settings.css";
```

- [x] **Step 3: Move responsive overrides**

Move only these backup/settings rules from the existing `@media (max-width: 1180px)` block into `src/styles/backup-settings.css`, wrapped in the same media query:

```css
@media (max-width: 1180px) {
  .backup-action-grid {
    grid-template-columns: 1fr;
  }

  .backup-history-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .backup-history-restore {
    grid-column: 1 / -1;
    justify-self: stretch;
  }

  .settings-form-grid,
  .settings-status-grid {
    grid-template-columns: 1fr;
  }

  .settings-status-grid > div {
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }

  .settings-status-grid > div:last-child {
    border-bottom: 0;
  }
}
```

- [x] **Step 4: Update architecture backlog**

Record that the first CSS modularization slice has been completed and adjust the next recommended item toward renderer workflow automation or the remaining release-readiness checks.

- [x] **Step 5: Verify**

Run:

```bash
npm run build
npm run lint
npm run test -- --run
git diff --check
```

Expected: all commands exit successfully.

- [x] **Step 6: Commit**

```bash
git add src/App.css src/styles/backup-settings.css docs/superpowers/2026-06-12-architecture-optimization-backlog.md docs/superpowers/plans/2026-06-17-css-modularization.md
git commit -m "refactor: split backup settings styles"
```
