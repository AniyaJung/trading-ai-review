# Trade Desk Prop Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce fine-grained `TradeDeskView` prop assembly in `App.tsx` without moving cross-workflow side effects into an oversized container.

**Architecture:** Add focused list and form containers that consume narrow slices of `TradeWorkflow`. Keep filtered-trade selection callbacks and the review/attachment orchestration explicit in `App.tsx`; the review area remains a separate future slice because it spans three workflows.

**Tech Stack:** React, TypeScript, Vitest, React server rendering.

---

### Task 1: Add focused trade list and form containers

**Files:**
- Create: `src/components/TradeDeskContainers.test.tsx`
- Create: `src/components/TradeListContainer.tsx`
- Create: `src/components/TradeFormContainer.tsx`
- Modify: `src/app/tradeWorkflow.ts`
- Modify: `src/components/TradeDeskView.tsx`
- Modify: `src/App.tsx`

- [x] **Step 1: Write failing container rendering tests**

Render the requested list and form container APIs with real workflow state. Assert that the list derives the selected filtered trade and that the form reads its values from the workflow.

- [x] **Step 2: Verify RED**

Run: `npm run test -- --run src/components/TradeDeskContainers.test.tsx`

Expected: FAIL because the two container modules do not exist.

- [x] **Step 3: Implement narrow workflow adapters**

Export the `TradeWorkflow` return type. Implement containers with `Pick`-based state/action contracts, update `TradeDeskView` to render them, and replace the detailed list/form prop objects in `App.tsx` with workflow-level inputs.

- [x] **Step 4: Verify focused tests**

Run: `npm run test -- --run src/app/tradeWorkflow.test.ts src/components/TradeDeskContainers.test.tsx`

Expected: both test files pass.

- [x] **Step 5: Run complete verification**

Run: `npm run test -- --run && npm run lint && npm run build && git diff --check`

Expected: all commands exit successfully.
