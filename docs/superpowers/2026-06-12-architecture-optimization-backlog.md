# Architecture Optimization Backlog

Date: 2026-06-12
Branch: `codex/safe-attachment-preview`

## Context

The project has completed the main local desktop, trade recording, rule, AI review, stats, backup/restore, AI settings, and local data reset loops. The current architecture is workable, but several boundaries should be tightened before larger P1 features such as tag filtering, market session dates, AI cost reporting, and charting.

## Current Handoff

- Current branch: `codex/safe-attachment-preview`.
- Latest commit: `9145768 feat: add stats date semantics and workflow refactors`.
- Worktree status after the feature commit: clean before this handoff note was edited.
- Latest verified commands:
  - `npm run test -- --run`: 45 test files and 174 tests passed.
  - `npm run lint`: passed.
  - `npm run build`: passed.
- No local preview/dev server is expected to be running.
- Important safety constraint: do not reset, delete, or clear real local SQLite or app data. Tests for reset, restore, migration, or destructive flows must use temporary directories.

## Next Conversation Bootstrap

Start the next development conversation with these commands:

```bash
git status --short --branch
git log --oneline -8
sed -n '1,260p' docs/superpowers/2026-06-12-architecture-optimization-backlog.md
```

Recommended next execution path:

1. Confirm whether the handoff note should be committed, since this note was written after commit `9145768`.
2. Continue with P1 tag statistics/filtering by deciding tag ownership and persistence:
   - whether AI review tags should remain only in `ai_review.tags_json`;
   - whether AI tags should be normalized into `tag` / `trade_tag_map`;
   - whether manual tags need a maintenance UI before stats filtering.
3. After the tag ownership decision, implement the smallest useful tag path:
   - tests first;
   - persist or derive tags consistently;
   - expose stats filters and trade drilldown filters;
   - keep preview-mode behavior deterministic.
4. If tag work is paused, the next useful engineering item is AI review hardening:
   - fixture evals for prompt/schema output;
   - error classification and retry policy;
   - usage/cost display.

## Execution Status

- Done: migrated cross-process DTOs from renderer and Electron-local declarations into `shared/contracts`.
- Done: extracted the backup/settings workflow from `src/App.tsx` into a dedicated app hook.
- Done: extracted the attachment workflow from `src/App.tsx` into a dedicated app hook.
- Done: extracted the review workflow from `src/App.tsx` into a dedicated app hook.
- Done: extracted the trade workflow from `src/App.tsx` into a dedicated app hook.
- Done: extracted the rule workflow from `src/App.tsx` into a dedicated app hook.
- Done: extracted the stats workflow from `src/App.tsx` into a dedicated app hook.
- Done: extracted the first `tradeService` row-to-DTO mapper into `electron/services/tradeMappers.ts`.
- Done: extracted trade read-query SQL from `tradeService` into `electron/services/tradeRepository.ts`.
- Done: extracted trade write repository helpers for closed trade row and execution persistence.
- Done: formalized stats date semantics with user local day and market session day filters.
- Next recommended execution item: decide tag ownership and persistence.

## P0 Architecture Hygiene

1. Move cross-process DTOs to `shared/`.
   - Problem: renderer globals, Electron services, and IPC/preload definitions duplicated many DTOs.
   - Target: define shared contracts once under `shared/contracts`, then import or re-export them from Electron and renderer.
   - Benefit: prevents IPC contract drift before statistics, tags, and AI usage data expand the surface area.

2. Keep `src/App.tsx` shrinking.
   - Problem: `App.tsx` still owns trade, rule, review, attachment, backup, settings, and stats workflows.
   - Target: extract workflow hooks/controllers such as `useTradesWorkflow`, `useReviewWorkflow`, `useAttachmentWorkflow`, and `useBackupSettingsWorkflow`.
   - Benefit: makes feature changes easier to test without rendering the whole app shell.
   - Progress: `useBackupSettingsWorkflow`, `useAttachmentWorkflow`, `useReviewWorkflow`, `useTradeWorkflow`, `useRuleWorkflow`, and `useStatsWorkflow` now own their respective state/actions.

3. Split large Electron services into repositories and mappers.
   - Problem: `tradeService` mixes SQL, row mapping, validation, and use-case orchestration.
   - Target: introduce focused repository/query helpers and DTO mappers while preserving service APIs.
   - Benefit: lowers risk when adding imports, tags, and more advanced trade filters.
   - Progress: trade detail mapping is now isolated in `electron/services/tradeMappers.ts`; read-query SQL and closed-trade write helpers now live in `electron/services/tradeRepository.ts`.

## P1 Product Architecture

4. Formalize statistics date semantics.
   - Problem: current stats filters use raw UTC `opened_at`.
   - Target: support user local day and market session day as explicit concepts.
   - Benefit: handles US futures sessions that cross natural calendar days.
   - Progress: database v2 stores `user_local_date` and `market_session_date`; stats filters now use explicit `dateBasis`, `dateFrom`, and `dateBefore`.

5. Decide tag ownership and persistence.
   - Problem: DB has `tag` and `trade_tag_map`, but AI tags currently live in review JSON.
   - Target: define whether AI tags, manual tags, or both populate the normalized tag tables.
   - Benefit: unlocks reliable tag filtering, statistics, and trade drilldown.

6. Harden destructive operation lifecycle.
   - Problem: backup restore and local reset close the database before file-level work.
   - Target: centralize validation, DB closing, failure guidance, and relaunch behavior.
   - Benefit: makes restore/reset failure modes easier to reason about and support.

## P2 Engineering Quality

7. Split AI adapter internals.
   - Problem: model defaults, prompt, schema, raw fetch, normalization, and error handling sit in one file.
   - Target: separate prompt/schema/client/normalizer and add fixture evals.
   - Benefit: enables retry policy, error classes, and usage/cost display.

8. Add renderer workflow automation.
   - Problem: many UI flows are manually smoke-tested.
   - Target: add focused Playwright or React Testing Library coverage for backup restore, settings danger zone, and review confirmation flows.
   - Benefit: catches regressions in state wiring and disabled/enabled UI states.

9. Modularize CSS as UI surface grows.
   - Problem: app-level CSS covers many unrelated views.
   - Target: split feature CSS or introduce shared design tokens.
   - Benefit: reduces style coupling across future stats/charting/settings work.

## Deferred

- CSV/broker import.
- Cloud sync, accounts, multi-device, and mobile support.
- Open trade lifecycle and backtesting.
