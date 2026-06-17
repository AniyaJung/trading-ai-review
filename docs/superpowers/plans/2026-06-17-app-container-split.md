# App Container Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce `src/App.tsx` view composition weight without changing workflow state ownership.

**Architecture:** Extract presentational container components for workspace routing and the trade desk layout. Keep hooks, data loading, mutation coordination, and selected-trade derivation in `App.tsx` for this slice; later slices can move stateful orchestration once the view boundary is stable.

**Tech Stack:** React, TypeScript component prop inference, existing Vitest/build verification.

---

## Chunk 1: Extract View Containers

### Task 1: Split Workspace And Trade Desk JSX

**Files:**
- Create: `src/components/TradeDeskView.tsx`
- Create: `src/components/AppWorkspaceView.tsx`
- Modify: `src/App.tsx`
- Modify: `docs/superpowers/2026-06-12-architecture-optimization-backlog.md`

- [x] **Step 1: Inspect current `App.tsx` responsibilities**
  - Run: `wc -l src/App.tsx`
  - Run: `sed -n '1,760p' src/App.tsx`
  - Expected: `App.tsx` owns workflow hooks, bootstrap effects, derived selected-trade state, view routing, and trade desk layout.

- [x] **Step 2: Extract `TradeDeskView`**
  - Move the `<section className="desk-grid">` composition into `src/components/TradeDeskView.tsx`.
  - Use `ComponentProps<typeof TradeListPanel>`, `ComponentProps<typeof TradeFormPanel>`, and `ComponentProps<typeof TradeReviewPanel>` to avoid duplicating child prop types.
  - Keep all callbacks and derived values passed from `App.tsx`.

- [x] **Step 3: Extract `AppWorkspaceView`**
  - Move the `currentView` switch into `src/components/AppWorkspaceView.tsx`.
  - Keep each existing view component unchanged.
  - Pass grouped props from `App.tsx`.

- [x] **Step 4: Update architecture backlog**
  - Mark the first `App.tsx` container split as complete.
  - Record that stateful workflow extraction remains future work.

## Chunk 2: Verification And Commit

### Task 2: Final Checks

**Files:**
- Files changed above.

- [x] **Step 1: Run verification**
  - Run: `npm run test -- --run`
  - Run: `npm run lint`
  - Run: `npm run build`
  - Run: `git diff --check`
  - Expected: all pass.

- [x] **Step 2: Commit container split**
  - Commit with message: `refactor: extract app view containers`
