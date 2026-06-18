# Stats View Container Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move statistics view-specific derivation and prop wiring out of `src/App.tsx` without changing behavior.

**Architecture:** Add a `StatsViewContainer` that accepts the stats workflow plus the trade, instrument, and rule data needed to derive the existing `StatsView` props. Keep the cross-feature drilldown callback in `App.tsx`, because it coordinates statistics, trade selection, attachments, rules, and routing.

**Tech Stack:** React, TypeScript, Vitest, React server rendering.

---

### Task 1: Add the statistics feature container

**Files:**
- Create: `src/components/StatsViewContainer.test.tsx`
- Create: `src/components/StatsViewContainer.tsx`
- Modify: `src/app/statsWorkflow.ts`
- Modify: `src/components/AppWorkspaceView.tsx`
- Modify: `src/App.tsx`

- [x] **Step 1: Write the failing test**

Render the requested `StatsViewContainer` API with preview trades and assert that the statistics heading, preview state, and derived symbol option are present.

- [x] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/components/StatsViewContainer.test.tsx`

Expected: FAIL because `StatsViewContainer` does not exist.

- [x] **Step 3: Write minimal implementation**

Export the stats workflow return type, create the container, derive the existing panel/options, and render `StatsView`. Replace the broad statistics prop object in `AppWorkspaceView` and `App.tsx` with the container inputs.

- [x] **Step 4: Run focused tests**

Run: `npm run test -- --run src/app/statsWorkflow.test.ts src/components/StatsViewContainer.test.tsx`

Expected: both test files pass.

- [x] **Step 5: Run complete verification**

Run: `npm run test -- --run && npm run lint && npm run build && git diff --check`

Expected: all commands exit successfully.
