# Rules View Container Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Rules view state/action prop mapping out of `App.tsx` without changing rule workflow ownership or topbar behavior.

**Architecture:** Add a `RulesViewContainer` that consumes `RuleWorkflow` and renders the existing `RulesView`. Keep shared rule data and topbar loading/save state available in `App.tsx`, and keep the rule-to-trade-form binding callback where the workflow is constructed.

**Tech Stack:** React, TypeScript, Vitest, React server rendering.

---

### Task 1: Extract Rules view mapping

**Files:**
- Create: `src/components/RulesViewContainer.test.tsx`
- Create: `src/components/RulesViewContainer.tsx`
- Modify: `src/app/ruleWorkflow.ts`
- Modify: `src/components/AppWorkspaceView.tsx`
- Modify: `src/App.tsx`

- [x] **Step 1: Write the failing render test**

Render the requested container API with the real initial rule workflow state and assert that the existing Rules view and initial guidance are present.

- [x] **Step 2: Verify RED**

Run: `npm run test -- --run src/components/RulesViewContainer.test.tsx`

Expected: FAIL because `RulesViewContainer` does not exist.

- [x] **Step 3: Implement the workflow adapter**

Export the `RuleWorkflow` return type, map its state/actions into `RulesView`, update workspace routing, and replace the detailed Rules prop object in `App.tsx` with the workflow.

- [x] **Step 4: Verify focused tests**

Run: `npm run test -- --run src/app/ruleWorkflow.test.ts src/components/RulesViewContainer.test.tsx`

Expected: both test files pass.

- [x] **Step 5: Run complete verification**

Run: `npm run test -- --run && npm run lint && npm run build && git diff --check`

Expected: all commands exit successfully.
