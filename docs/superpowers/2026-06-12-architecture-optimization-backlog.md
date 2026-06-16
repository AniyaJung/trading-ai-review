# Architecture Optimization Backlog

Date: 2026-06-16
Branch: `codex/safe-attachment-preview`

## Context

The project has completed the main local desktop, trade recording, rule, AI review, stats, backup/restore, AI settings, local data reset, and AI tag statistics filtering loops. The current architecture is workable, but several boundaries should be tightened before larger P1 features such as AI cost reporting, packaging verification, and charting.

## Current Handoff

- Current branch: `codex/safe-attachment-preview`.
- Latest commit before this documentation update: `256796d polish app review workflow copy`.
- Worktree status before this documentation update: clean.
- Latest verified commands:
  - `npm run test -- --run`: 45 test files and 181 tests passed.
  - `npm run lint`: passed.
  - `npm run build`: passed.
- Latest UI smoke check: Electron dev window showed the light-blue trade workspace and updated friendly Chinese copy after Vite HMR.
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

1. Confirm whether this documentation update should be committed.
2. Continue with AI review hardening:
   - fixture evals for prompt/schema output;
   - error classification and retry policy;
   - usage/cost display.
3. In parallel or afterward, run initial packaging verification for app data paths, `node:sqlite`, file pickers, backup/restore, and `safeStorage`.

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
- Done: added backup history listing, restore eligibility status, historical backup restore, and restore failure guidance.
- Done: refreshed the renderer with a light-blue desktop workbench theme.
- Done: rewrote user-facing empty states, validation guidance, confirmation prompts, action states, and destructive-operation copy in friendlier Chinese.
- Done: decided tag ownership and persistence for the first useful slice: confirmed/corrected AI string tags remain in `ai_review.tags_json` and normalize into `tag` / `trade_tag_map` as `setup` tags for stats filtering and drilldown.
- Next recommended execution item: AI review hardening or initial packaging verification.

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
   - Progress: confirmed/corrected AI string tags now populate `tag` / `trade_tag_map`; stats filtering and trade drilldown support `tagId`. Manual tag maintenance and category editing remain future work.

6. Harden destructive operation lifecycle.
   - Problem: backup restore and local reset close the database before file-level work.
   - Target: centralize validation, DB closing, failure guidance, and relaunch behavior.
   - Benefit: makes restore/reset failure modes easier to reason about and support.
   - Progress: backup history, restore eligibility, safety backup, restore guidance, and local reset confirmation are in place. Future work should focus on packaged-app verification and schema-version migration policy.

## P2 Engineering Quality

7. Split AI adapter internals.
   - Problem: model defaults, prompt, schema, raw fetch, normalization, and error handling sit in one file.
   - Target: separate prompt/schema/client/normalizer and add fixture evals.
   - Benefit: enables retry policy, error classes, and usage/cost display.

8. Add renderer workflow automation.
   - Problem: many UI flows are manually smoke-tested.
   - Target: add focused Playwright or React Testing Library coverage for backup restore, settings danger zone, review confirmation flows, and responsive text/copy regressions.
   - Benefit: catches regressions in state wiring and disabled/enabled UI states.

9. Modularize CSS as UI surface grows.
   - Problem: app-level CSS covers many unrelated views.
   - Target: split feature CSS or introduce shared design tokens while preserving the current light-blue workbench theme.
   - Benefit: reduces style coupling across future stats/charting/settings work.

## Deferred

- CSV/broker import.
- Cloud sync, accounts, multi-device, and mobile support.
- Open trade lifecycle and backtesting.
