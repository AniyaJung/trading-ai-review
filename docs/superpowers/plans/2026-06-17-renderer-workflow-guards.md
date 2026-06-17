# Renderer Workflow Guards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add automated renderer workflow guard coverage without introducing a browser test dependency yet.

**Architecture:** Extend existing pure panel-state helpers so button disabled states include testable user-facing reasons. Use those reasons in the view as `title` text. This gives deterministic coverage for high-risk workflow guards while keeping the current Vitest-only test stack.

**Tech Stack:** React renderer helpers, Vitest.

---

## Chunk 1: Backup History Restore Guard Reasons

### Task 1: Add Testable Restore Disabled Reasons

**Files:**
- Modify: `src/app/backupPanel.ts`
- Modify: `src/app/backupPanel.test.ts`
- Modify: `src/components/BackupView.tsx`
- Modify: `docs/superpowers/2026-06-12-architecture-optimization-backlog.md`

- [x] **Step 1: Write failing guard tests**
  - Assert history restore is disabled with a reason in browser preview.
  - Assert history restore is disabled with a reason while another backup operation is running.
  - Assert unsupported backups expose their problem or status reason.

- [x] **Step 2: Implement restore disabled reasons**
  - Add `restoreDisabledReason` to formatted history items.
  - Keep existing `canRestore` behavior unchanged.

- [x] **Step 3: Use reason in the view**
  - Set the restore button `title` to `restoreDisabledReason ?? "恢复此备份"`.

- [x] **Step 4: Update architecture backlog**
  - Mark the first renderer workflow guard automation slice as complete.

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

- [x] **Step 2: Commit renderer workflow guards**
  - Commit with message: `test: cover backup restore workflow guards`
