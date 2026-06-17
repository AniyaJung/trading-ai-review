# Stats Query Boundary Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split stats filter SQL and aggregate SQL helpers out of `statsService.ts` before chart datasets add more query surface area.

**Architecture:** Keep `getStatsOverview(db, filters)` as the public service API. Move reusable filter-clause construction into `statsFilters.ts` and aggregate query helpers into `statsAggregates.ts`; keep final DTO mapping and ratio/money calculations in `statsService.ts`.

**Tech Stack:** Electron service modules, SQLite, Vitest.

---

## Chunk 1: Filter And Aggregate Query Modules

### Task 1: Split Stats Query Helpers

**Files:**
- Create: `electron/services/statsFilters.ts`
- Create: `electron/services/statsFilters.test.ts`
- Create: `electron/services/statsAggregates.ts`
- Modify: `electron/services/statsService.ts`
- Modify: `docs/superpowers/2026-06-12-architecture-optimization-backlog.md`

- [x] **Step 1: Write failing filter helper test**
  - Assert `buildTradeFilterClause` chooses `trade.market_session_date` when requested.
  - Assert tag filters can be excluded for tag option aggregation.

- [x] **Step 2: Extract `statsFilters.ts`**
  - Move `TradeFilterClause` and `buildTradeFilterClause`.
  - Export the helper for aggregate modules and tests.

- [x] **Step 3: Extract `statsAggregates.ts`**
  - Move aggregate row types, `reviewedStatusSql`, and SQL query helpers.
  - Keep row-to-contract mapping in `statsService.ts`.

- [x] **Step 4: Update architecture backlog**
  - Mark stats query boundary split as complete for the first slice.
  - Record future chart datasets can build on the same filter/aggregate modules.

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

- [x] **Step 2: Commit stats query split**
  - Commit with message: `refactor: split stats query helpers`
