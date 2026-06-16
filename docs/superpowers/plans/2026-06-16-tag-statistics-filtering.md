# Tag Statistics Filtering Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize confirmed AI review tags into existing tag tables and expose tag filtering in statistics and trade drilldown.

**Architecture:** Keep raw AI tags in `ai_review.tags_json`, and synchronize string tags to `tag` / `trade_tag_map` only when a review becomes confirmed or corrected. Reuse existing stats filter patterns by adding `tagId` to shared contracts, Electron stats SQL, renderer preview helpers, and the stats view.

**Tech Stack:** Electron main process services, Node/Electron `node:sqlite`, React + TypeScript renderer, Vitest.

---

## Chunk 1: Review Tag Persistence

### Task 1: Sync Confirmed Review Tags

**Files:**
- Modify: `electron/services/reviewService.test.ts`
- Modify: `electron/services/reviewService.ts`

- [x] **Step 1: Write failing review service tests**
  - Verify draft creation does not populate `trade_tag_map`.
  - Verify `confirmReview` normalizes string tags.
  - Verify `correctReview` replaces previous normalized tags.
  - Verify `invalidateReview` clears normalized tag mappings.

- [x] **Step 2: Run review service tests and verify failure**
  - Run: `npm run test -- electron/services/reviewService.test.ts --run`
  - Expected: FAIL because normalized tag syncing is not implemented.

- [x] **Step 3: Implement minimal tag sync helpers**
  - Add helper to parse string tag names from `AIReview.tags`.
  - Upsert `tag(name, category='setup')`.
  - Replace `trade_tag_map` for the reviewed trade during confirm/correct/invalidate.

- [x] **Step 4: Run review service tests and verify pass**
  - Run: `npm run test -- electron/services/reviewService.test.ts --run`
  - Expected: PASS.

## Chunk 2: Stats Tag Filtering

### Task 2: Add Tag Filter To Stats Service

**Files:**
- Modify: `shared/contracts/desktopApi.ts`
- Modify: `electron/services/statsService.test.ts`
- Modify: `electron/services/statsService.ts`

- [x] **Step 1: Write failing stats service tests**
  - Verify `tagId` filters total trade count and confirmed/corrected metrics.
  - Verify `byTag` lists normalized tags with trade counts.

- [x] **Step 2: Run stats service tests and verify failure**
  - Run: `npm run test -- electron/services/statsService.test.ts --run`
  - Expected: FAIL because `tagId` and `byTag` are not implemented.

- [x] **Step 3: Extend shared stats contracts**
  - Add `TagCategory`, `TagSummary`, `StatsOverview.byTag`, and `StatsOverviewFilters.tagId`.

- [x] **Step 4: Implement stats SQL**
  - Add `exists` tag filter to the base trade filter.
  - Add `getTagAggregates` for confirmed/corrected trades under the current non-tag filters.

- [x] **Step 5: Run stats service tests and verify pass**
  - Run: `npm run test -- electron/services/statsService.test.ts --run`
  - Expected: PASS.

## Chunk 3: Renderer Stats UI

### Task 3: Add Tag Dropdown And Preview Filtering

**Files:**
- Modify: `src/app/statsPanel.test.ts`
- Modify: `src/app/statsPanel.ts`
- Modify: `src/app/previewData.ts`
- Modify: `src/app/previewTrades.test.ts`
- Modify: `src/app/previewTrades.ts`
- Modify: `src/components/StatsView.tsx`

- [x] **Step 1: Write failing renderer helper tests**
  - Verify `buildStatsOverviewFilters` includes `tagId`.
  - Verify preview stats and drilldown filter by tag.
  - Verify drilldown labels include selected tag names.

- [x] **Step 2: Run renderer tests and verify failure**
  - Run: `npm run test -- src/app/statsPanel.test.ts src/app/previewTrades.test.ts --run`
  - Expected: FAIL because renderer tag filter support is missing.

- [x] **Step 3: Implement renderer helper changes**
  - Add `tagId` to filter state.
  - Add tags to preview sample trades.
  - Add preview filtering and `byTag` aggregation.
  - Add tag names to drilldown label formatting.

- [x] **Step 4: Add stats view tag dropdown**
  - Use `overview.byTag` for dropdown options.
  - Include the selected tag in drilldown filters.

- [x] **Step 5: Run renderer tests and verify pass**
  - Run: `npm run test -- src/app/statsPanel.test.ts src/app/previewTrades.test.ts --run`
  - Expected: PASS.

## Chunk 4: Full Verification

### Task 4: Verify Integrated Build

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/2026-06-10-next-conversation-context.md`
- Modify: `docs/superpowers/2026-06-12-architecture-optimization-backlog.md`

- [x] **Step 1: Update local progress docs**
  - Mark tag statistics/filtering as implemented.
  - Keep remaining tag aggregation chart/manual tag UI notes scoped.

- [x] **Step 2: Run full verification**
  - Run: `npm run test -- --run`
  - Run: `npm run lint`
  - Run: `npm run build`
  - Expected: all commands pass.

- [x] **Step 3: Inspect git diff**
  - Run: `git status --short`
  - Run: `git diff --stat`
  - Expected: only intended files changed.
