# Trade Review Container Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Trade Review display derivation and selected-trade loading lifecycle out of `App.tsx` while keeping cross-workflow mutations explicit.

**Architecture:** Add a `TradeReviewContainer` that consumes narrow slices of trade, review, and attachment workflows. It derives panel state, scoped errors, preview details, and the attachment overlay; `App.tsx` continues to coordinate delete cleanup, review mutation refresh, and rule-check detail refresh through typed callbacks.

**Tech Stack:** React, TypeScript, Vitest, React server rendering.

---

### Task 1: Extract the Trade Review adapter

**Files:**
- Create: `src/components/TradeReviewContainer.test.tsx`
- Create: `src/components/TradeReviewContainer.tsx`
- Modify: `src/app/attachmentWorkflow.ts`
- Modify: `src/app/reviewWorkflow.ts`
- Modify: `src/components/TradeDeskView.tsx`
- Modify: `src/App.tsx`

- [x] **Step 1: Write the failing render test**

Render the requested container API in browser-preview mode with real initial workflow state and preview trades. Assert that it derives a selected trade and preview trade detail for the existing review panel.

- [x] **Step 2: Verify RED**

Run: `npm run test -- --run src/components/TradeReviewContainer.test.tsx`

Expected: FAIL because `TradeReviewContainer` does not exist.

- [x] **Step 3: Implement the narrow adapter**

Export review and attachment workflow return types, implement `Pick`-based workflow contracts, move selected-trade display derivation and loading effects into the container, and replace the detailed review prop object in `App.tsx` with workflow inputs plus explicit mutation callbacks.

- [x] **Step 4: Verify focused tests**

Run: `npm run test -- --run src/app/reviewWorkflow.test.ts src/app/attachmentWorkflow.test.ts src/components/TradeReviewContainer.test.tsx`

Expected: all three test files pass.

- [x] **Step 5: Run complete verification**

Run: `npm run test -- --run && npm run lint && npm run build && git diff --check`

Expected: all commands exit successfully.
