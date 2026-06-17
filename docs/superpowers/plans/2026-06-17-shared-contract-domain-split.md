# Shared Contract Domain Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `shared/contracts/desktopApi.ts` DTO definitions into domain files while preserving the public `shared/contracts/desktopApi` import surface.

**Architecture:** Move trade/rule/review/attachment/stats/backup/settings/database DTOs into focused files under `shared/contracts/`. Keep `desktopApi.ts` as the aggregator and `DesktopApi` interface owner so existing Electron and renderer imports continue to work.

**Tech Stack:** TypeScript shared modules, Vitest type/runtime contract checks.

---

## Chunk 1: Domain Contract Files

### Task 1: Split DTO Definitions By Feature Domain

**Files:**
- Create: `shared/contracts/commonContracts.ts`
- Create: `shared/contracts/databaseContracts.ts`
- Create: `shared/contracts/tradeContracts.ts`
- Create: `shared/contracts/ruleContracts.ts`
- Create: `shared/contracts/reviewContracts.ts`
- Create: `shared/contracts/attachmentContracts.ts`
- Create: `shared/contracts/statsContracts.ts`
- Create: `shared/contracts/backupContracts.ts`
- Create: `shared/contracts/settingsContracts.ts`
- Modify: `shared/contracts/desktopApi.ts`
- Modify: `shared/contracts/desktopApi.test.ts`
- Modify: `docs/superpowers/2026-06-12-architecture-optimization-backlog.md`

- [x] **Step 1: Write failing domain contract test**
  - Add a test importing runtime-safe values from the new domain contract files.
  - Add type-only checks that `CreateClosedTradeInput` and `BackupHistoryItem` are available from both domain files and `desktopApi.ts`.
  - Run: `npm run test -- --run shared/contracts/desktopApi.test.ts`
  - Expected: FAIL because domain files do not exist yet.

- [x] **Step 2: Move DTOs into domain files**
  - Move shared primitives to `commonContracts.ts`.
  - Move database status/instrument DTOs to `databaseContracts.ts`.
  - Move trade DTOs to `tradeContracts.ts`.
  - Move rule DTOs to `ruleContracts.ts`.
  - Move review DTOs to `reviewContracts.ts`.
  - Move attachment DTOs and `supportedAttachmentImageTypes` to `attachmentContracts.ts`.
  - Move stats DTOs to `statsContracts.ts`.
  - Move backup DTOs to `backupContracts.ts`.
  - Move settings/reset DTOs to `settingsContracts.ts`.

- [x] **Step 3: Preserve `desktopApi.ts` public surface**
  - Re-export all domain DTOs from `desktopApi.ts`.
  - Keep `DesktopApi` in `desktopApi.ts`, importing domain DTOs with `import type`.
  - Do not update downstream imports in this slice.
  - Run: `npm run test -- --run shared/contracts/desktopApi.test.ts`
  - Expected: PASS.

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

- [x] **Step 2: Commit shared contract split**
  - Commit with message: `refactor: split shared desktop contracts`
