# Architecture Optimization Backlog

Date: 2026-06-17
Branch: `codex/safe-attachment-preview`

## Context

The project has completed the main local desktop, trade recording, rule, AI review, stats, backup/restore, AI settings, local data reset, and AI tag statistics filtering loops. The current architecture is workable, but several boundaries should be tightened before larger P1 features such as AI cost reporting, packaging verification, and charting.

## Current Handoff

- Current branch: `codex/safe-attachment-preview`.
- Latest commit before this documentation update: `d06982a feat: add tag statistics filtering`.
- Worktree status before this documentation update: clean; branch is ahead of origin by 1 commit.
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
2. Decide whether to push the local tag statistics commit.
3. Continue with AI review hardening:
   - fixture evals for prompt/schema output;
   - error classification and retry policy;
   - usage/cost display.
4. Before release, complete the remaining manual packaged-app checks:
   - native file picker and attachment preview;
   - backup restore through the packaged UI;
   - AI key save/relaunch/decrypt flow;
   - signed/notarized distribution tool decision.

## 2026-06-17 Architecture Re-Review

Current judgment: the architecture is healthy enough to keep building. Electron main owns SQLite, files, backups, and local secrets; renderer logic stays behind preload APIs; shared contracts now prevent most cross-process drift. The next phase should avoid broad rewrites and instead tighten specific boundaries before adding larger features.

Recommended priority order:

1. **Packaging and release path first.**
   - Risk: `node:sqlite` is an Electron/Node experimental API, and distribution packaging is still not a signed/notarized release path.
   - Target: keep the local directory package smoke-verified, then complete manual packaged UI checks and choose a real release tool for signing/notarization.
   - Reason: packaged startup, SQLite, app data, backup creation, and `safeStorage` are now automatically verified; file picker, restore UI, and distribution artifacts remain release-readiness risks.

2. **AI review hardening next.**
   - Risk: `electron/services/openAiReviewAdapter.ts` still combines model defaults, prompt construction, schema, fetch, parsing, normalization, and error handling.
   - Target: split prompt builder, schema definition, OpenAI client, response normalizer, error classification, and fixture evals.
   - Reason: retry policy, usage/cost display, and reliable schema evolution will be difficult while this remains one file.

3. **Keep shrinking `src/App.tsx` by extracting containers.**
   - Risk: `src/App.tsx` has improved, but it is still the cross-workflow assembly point and remains one of the largest runtime files.
   - Target: introduce focused containers such as `TradesWorkspaceContainer`, `StatsViewContainer`, and `BackupSettingsContainer`.
   - Reason: this reduces prop threading and makes cross-workflow side effects easier to inspect.
   - Progress: extracted `AppWorkspaceView` for top-level view routing and `TradeDeskView` for the trade list/form/review layout. `App.tsx` still owns workflow hooks, derived props, and cross-workflow mutation synchronization; the next meaningful reduction should move stateful view props and side-effect coordination behind feature containers.

4. **Split shared desktop contracts by domain before they grow again.**
   - Risk: `shared/contracts/desktopApi.ts` now centralizes contracts correctly, but it is becoming a large mixed-domain file.
   - Target: split into domain files such as `tradeContracts.ts`, `reviewContracts.ts`, `statsContracts.ts`, and `backupSettingsContracts.ts`, with `desktopApi.ts` re-exporting the public surface.
   - Reason: future charting, AI usage, packaging status, and manual tagging contracts will otherwise make the contract file harder to navigate.
   - Progress: domain contract files now exist for common, database, trade, rule, review, attachment, stats, backup, and settings/reset DTOs. `desktopApi.ts` remains the public aggregator and still owns the `DesktopApi` interface, so downstream imports can migrate gradually.

5. **Revisit tag modeling before manual tag UI.**
   - Risk: the first useful slice normalizes confirmed/corrected AI tags as `setup`; it does not express tag source, ownership, or category editing.
   - Target: decide whether to add source/ownership metadata before implementing manual tag maintenance.
   - Reason: without this decision, future manual tags could be overwritten by AI correction flows or become indistinguishable in statistics.
   - Progress: `trade_tag_map.source` now records `ai_review` vs `manual` ownership. AI review confirmation/correction/invalidation only rewrites AI-owned mappings, so future manual tag UI can write manual mappings without being erased by AI sync.

6. **Split stats queries before adding charts.**
   - Risk: `getStatsOverview` now handles overview metrics plus instrument and tag breakdowns.
   - Target: split stats query helpers or introduce a stats repository before adding time trends, rule aggregation, and chart data.
   - Reason: charting will otherwise turn the overview function into a broad reporting endpoint.
   - Progress: `statsFilters.ts` now owns reusable trade filter SQL, and `statsAggregates.ts` owns aggregate query helpers. `statsService.ts` remains the public API and handles DTO mapping plus ratio/money calculations.

7. **Centralize destructive operation lifecycle.**
   - Risk: restore, reset, future schema migration, and packaged relaunch behavior all need the same careful sequence: validate, close DB, create safety backup, perform file work, recover or guide the user on failure.
   - Target: introduce a small coordinator for destructive local-data operations.
   - Reason: it reduces the chance of inconsistent failure handling across reset, restore, and migration paths.
   - Progress: backup restore and local reset now share `runDestructiveOperation` for close-before-operation and after-success hooks, and both registrations use `createCloseDatabaseOnce`.

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
- Done: completed an architecture re-review and recorded prioritized optimization targets.
- Done: added a local macOS directory packaging path and packaged smoke verification for app startup, temp app data, SQLite migration, backup zip creation, and `safeStorage`.
- Done: completed the first AI review hardening slice by splitting OpenAI prompt/schema/client/response/error boundaries, adding retryable error classification, fixture evals, provider usage preservation, and review-panel usage/cost metadata display.
- Done: completed the first `App.tsx` view-container split by extracting workspace routing and trade desk layout containers while keeping state ownership stable.
- Done: split shared desktop contracts into domain files while preserving `shared/contracts/desktopApi` as the public API surface.
- Done: added tag mapping source ownership so future manual tags will not be overwritten by AI review tag sync.
- Done: split stats filter and aggregate query helpers out of `statsService.ts`.
- Done: centralized destructive operation lifecycle handling for backup restore and local reset IPC paths.
- Done: added the first renderer workflow guard automation slice by giving backup history restore actions testable disabled reasons and surfacing them in button titles.
- Done: completed the first CSS modularization slice by moving backup/settings view styles and responsive overrides into a feature stylesheet imported by `App.css`.
- Next recommended execution item: continue desktop-app architecture work by extracting the next stateful `App.tsx` feature container. Browser-preview Playwright coverage is not a priority unless the browser preview becomes a supported product surface; packaged manual checks remain paused until packaging work resumes, and configurable AI pricing needs a pricing policy first.

## P0 Architecture Hygiene

1. Move cross-process DTOs to `shared/`.
   - Problem: renderer globals, Electron services, and IPC/preload definitions duplicated many DTOs.
   - Target: define shared contracts once under `shared/contracts`, then import or re-export them from Electron and renderer.
   - Benefit: prevents IPC contract drift before statistics, tags, and AI usage data expand the surface area.

2. Keep `src/App.tsx` shrinking.
   - Problem: `App.tsx` still owns trade, rule, review, attachment, backup, settings, and stats workflows.
   - Target: extract workflow hooks/controllers such as `useTradesWorkflow`, `useReviewWorkflow`, `useAttachmentWorkflow`, and `useBackupSettingsWorkflow`.
   - Benefit: makes feature changes easier to test without rendering the whole app shell.
   - Progress: `useBackupSettingsWorkflow`, `useAttachmentWorkflow`, `useReviewWorkflow`, `useTradeWorkflow`, `useRuleWorkflow`, and `useStatsWorkflow` now own their respective state/actions. `AppWorkspaceView` and `TradeDeskView` now own the top-level view switch and trade desk layout.
   - Next: extract stateful feature containers so `App.tsx` becomes mostly shell routing and top-level composition.

3. Split large Electron services into repositories and mappers.
   - Problem: `tradeService` mixes SQL, row mapping, validation, and use-case orchestration.
   - Target: introduce focused repository/query helpers and DTO mappers while preserving service APIs.
   - Benefit: lowers risk when adding imports, tags, and more advanced trade filters.
   - Progress: trade detail mapping is now isolated in `electron/services/tradeMappers.ts`; read-query SQL and closed-trade write helpers now live in `electron/services/tradeRepository.ts`.
   - Next: apply the same boundary discipline to stats queries and the AI adapter before those surfaces grow.

## P1 Product Architecture

4. Verify packaging and release runtime.
   - Problem: the app has build output but no committed packaging path; packaged runtime behavior is still unverified.
   - Target: choose and commit a packaging setup only after verifying macOS packaged startup, app data paths, `node:sqlite`, file pickers, backup/restore, and `safeStorage`.
   - Benefit: turns the project from a dev-only Electron app into a locally shippable desktop tool.
   - Progress: `npm run pack:dir` and `npm run smoke:packaged` verify local unsigned packaged startup, temp `userData`, SQLite migration v3, backup zip creation, and `safeStorage`. Manual checks remain for file picker, attachment preview, restore UI, AI key relaunch/decrypt, and signed/notarized distribution.

5. Formalize statistics date semantics.
   - Problem: current stats filters use raw UTC `opened_at`.
   - Target: support user local day and market session day as explicit concepts.
   - Benefit: handles US futures sessions that cross natural calendar days.
   - Progress: database v2 stores `user_local_date` and `market_session_date`; stats filters now use explicit `dateBasis`, `dateFrom`, and `dateBefore`.

6. Decide tag ownership and persistence.
   - Problem: DB has `tag` and `trade_tag_map`, but AI tags currently live in review JSON.
   - Target: define whether AI tags, manual tags, or both populate the normalized tag tables.
   - Benefit: unlocks reliable tag filtering, statistics, and trade drilldown.
   - Progress: confirmed/corrected AI string tags now populate `tag` / `trade_tag_map`; stats filtering and trade drilldown support `tagId`. `trade_tag_map.source` separates `ai_review` and `manual` ownership so AI tag sync only rewrites AI-owned mappings.
   - Next: implement manual tag maintenance UI and category editing when that product scope is prioritized.

7. Harden destructive operation lifecycle.
   - Problem: backup restore and local reset close the database before file-level work.
   - Target: centralize validation, DB closing, failure guidance, and relaunch behavior.
   - Benefit: makes restore/reset failure modes easier to reason about and support.
   - Progress: backup history, restore eligibility, safety backup, restore guidance, local reset confirmation, shared destructive lifecycle execution, and close-once DB handling are in place. Future work should focus on packaged-app manual checks and schema-version migration policy.

## P2 Engineering Quality

8. Split AI adapter internals.
   - Problem: model defaults, prompt, schema, raw fetch, normalization, and error handling sit in one file.
   - Target: separate prompt/schema/client/normalizer and add fixture evals.
   - Benefit: enables retry policy, error classes, and usage/cost display.
   - Progress: prompt, schema, response normalizer, OpenAI client, and error classification are now split into focused service modules. The adapter has retryable 408/429/5xx/network handling, fixture coverage for nested Responses API output, raw usage preservation, and renderer display for token usage plus available cost metadata. Pricing is intentionally not hard-coded; future work should add configurable rates or provider billing import before showing estimated costs for models without provider cost data.

9. Split shared contracts by domain.
   - Problem: `shared/contracts/desktopApi.ts` successfully centralizes the IPC contract, but it is becoming a large mixed-domain file.
   - Target: split contract types by feature domain and keep `desktopApi.ts` as the public aggregator.
   - Benefit: keeps future AI usage, charts, packaging, and manual tag contracts readable.
   - Progress: split DTOs into focused domain files under `shared/contracts/` and kept `desktopApi.ts` as an aggregator plus `DesktopApi` interface owner.

10. Split stats query boundaries before charting.
   - Problem: stats overview, instrument aggregation, and tag aggregation already live together in one service entry point.
   - Target: extract focused query helpers or a stats repository before adding time-series, rule, and tag chart datasets.
   - Benefit: keeps reporting additions testable without overloading `getStatsOverview`.
   - Progress: extracted reusable filter SQL and aggregate query helpers; future chart datasets can add query helpers without expanding `statsService.ts`.

11. Add renderer workflow automation.
   - Problem: many UI flows are manually smoke-tested.
   - Target: add focused app-level coverage for backup restore, settings danger zone, review confirmation flows, and responsive text/copy regressions, prioritizing pure renderer state tests or Electron/app-runtime checks over browser-preview tests.
   - Benefit: catches regressions in state wiring and disabled/enabled UI states.
   - Progress: backup history restore guard reasons are covered in pure renderer state tests and surfaced in button titles. Browser-preview Playwright coverage was explicitly deprioritized because this project targets the desktop app, not the Vite preview as a supported product surface.

12. Modularize CSS as UI surface grows.
   - Problem: app-level CSS covers many unrelated views.
   - Target: split feature CSS or introduce shared design tokens while preserving the current light-blue workbench theme.
   - Benefit: reduces style coupling across future stats/charting/settings work.
   - Progress: backup/settings view styles now live in `src/styles/backup-settings.css`, with `src/App.css` kept as the global entrypoint. Future slices can extract stats, rules, and trade-desk styles using the same pattern.

## Deferred

- CSV/broker import.
- Cloud sync, accounts, multi-device, and mobile support.
- Open trade lifecycle and backtesting.
