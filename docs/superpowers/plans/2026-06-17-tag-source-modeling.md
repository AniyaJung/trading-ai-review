# Tag Source Modeling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tag ownership metadata before manual tag maintenance UI can create user-owned tags.

**Architecture:** Preserve the existing `tag` catalog and `trade_tag_map` relationship, but add a `source` column to `trade_tag_map`. AI review synchronization only owns mappings where `source = 'ai_review'`; future manual UI can write `source = 'manual'` without being erased by AI review confirmation, correction, or invalidation.

**Tech Stack:** SQLite migration v3, Electron review service, Vitest.

---

## Chunk 1: Tag Mapping Source Ownership

### Task 1: Add Source Metadata To Trade Tag Mapping

**Files:**
- Modify: `electron/data/database.ts`
- Modify: `electron/data/database.test.ts`
- Modify: `electron/ipc/databaseIpc.test.ts`
- Modify: `electron/services/reviewService.ts`
- Modify: `electron/services/reviewService.test.ts`
- Modify: `scripts/smoke-packaged-app.mjs`
- Modify: `docs/superpowers/packaging-verification.md`
- Modify: `docs/superpowers/2026-06-12-architecture-optimization-backlog.md`

- [x] **Step 1: Write failing database and review service tests**
  - Assert new databases use migration version 3 and `trade_tag_map.source`.
  - Assert v2 mappings migrate to `source = 'ai_review'`.
  - Assert AI review tag correction/invalidation does not delete `source = 'manual'` mappings.

- [x] **Step 2: Implement migration v3**
  - Add `source text not null default 'ai_review' check (source in ('ai_review', 'manual'))` to new schemas.
  - Add `migrateToVersionThree`.
  - Bump supported database version to 3.

- [x] **Step 3: Scope AI tag sync by source**
  - Insert AI review mappings with `source = 'ai_review'`.
  - Clear only AI-owned mappings before AI review correction/invalidation.

- [x] **Step 4: Update version-sensitive checks and docs**
  - Update database IPC expectations.
  - Update packaged smoke expected migration version.
  - Update architecture and packaging docs.

## Chunk 2: Verification And Commit

### Task 2: Final Checks

**Files:**
- Files changed above.

- [x] **Step 1: Run verification**
  - Run: `npm run test -- --run`
  - Run: `npm run lint`
  - Run: `npm run build`
  - Run: `npm run pack:dir && npm run smoke:packaged`
  - Run: `git diff --check`
  - Expected: all pass.

- [x] **Step 2: Commit tag source modeling**
  - Commit with message: `feat: track tag mapping source`
