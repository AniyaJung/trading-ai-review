# Destructive Operation Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize database-close and post-success relaunch lifecycle handling for backup restore and local reset operations.

**Architecture:** Keep backup and settings IPC APIs unchanged. Add a small shared IPC helper that runs close-before-operation and after-success hooks consistently, plus a reusable close-once database wrapper.

**Tech Stack:** Electron IPC helpers, Vitest.

---

## Chunk 1: Lifecycle Helper

### Task 1: Extract Destructive Operation Lifecycle

**Files:**
- Create: `electron/ipc/destructiveOperation.ts`
- Create: `electron/ipc/destructiveOperation.test.ts`
- Modify: `electron/ipc/backupIpc.ts`
- Modify: `electron/ipc/settingsIpc.ts`
- Modify: `docs/superpowers/2026-06-12-architecture-optimization-backlog.md`

- [x] **Step 1: Write lifecycle helper tests**
  - Assert close hook runs before the operation.
  - Assert after-success hook runs only after successful operation.
  - Assert close-once wrapper closes the database once across repeated calls.

- [x] **Step 2: Implement lifecycle helper**
  - Add `runDestructiveOperation`.
  - Add `createCloseDatabaseOnce`.

- [x] **Step 3: Wire backup/settings IPC**
  - Use `runDestructiveOperation` in restore and reset handlers.
  - Use `createCloseDatabaseOnce` in Electron registration.

- [x] **Step 4: Update architecture backlog**
  - Mark destructive lifecycle centralization as complete.

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

- [x] **Step 2: Commit destructive lifecycle helper**
  - Commit with message: `refactor: centralize destructive operation lifecycle`
