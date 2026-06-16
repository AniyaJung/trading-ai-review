# AI Trading Review

个人本地桌面 AI 交易复盘应用。第一版聚焦已平仓单笔交易：手动录入交易事实、上传截图和笔记、关联入场规则版本、生成结构化 AI 复盘、用户确认后进入统计。

## Current Scope

Current implemented scope:

- Electron + React + TypeScript + Vite scaffold.
- Desktop workbench shell with simple app-state navigation.
- Futures PnL/R multiple calculation core with Vitest coverage.
- Shared futures calculation module used by both renderer and Electron main process.
- Local SQLite database initialization in the Electron main process.
- Closed-trade entry form writes real trades to local SQLite through the preload API.
- Closed-trade form has client-side Chinese validation and local datetime handling.
- Trade list reads real SQLite data in Electron and avoids showing sample data before load.
- Selected trade detail can be loaded from SQLite, including entry/exit executions.
- Existing closed trades can be edited; updating recalculates PnL/R and rebuilds entry/exit executions.
- Trades can be deleted through the Electron preload API with SQLite cascade cleanup and attachment file cleanup.
- Trade screenshots can be selected through the Electron preload API, copied into the app attachments directory, listed, and deleted.
- Trade screenshots can be previewed inline through a controlled Electron preload API that returns data URLs for stored attachment ids.
- Entry rules can be created, versioned immutably, archived, listed, and bound to closed trades by rule version.
- Trade detail shows the bound entry rule version, content, and checklist snapshot.
- Main workbench UI is split into focused React components for sidebar, topbar, trade list, trade form, trade review/detail, attachments, rules, stats, backup, and settings.
- AI review drafts, confirmation, correction, invalidation, and rule-check edits have local service and preload IPC plumbing that syncs `trade.ai_review_status`.
- AI review generation is connected through the Electron main process using the OpenAI Responses API with structured output and optional screenshot inputs.
- Confirmed/corrected AI review string tags are normalized into `tag` / `trade_tag_map` for statistics filtering and trade drilldown.
- The settings page can save AI Key/model/prompt configuration; API keys are stored in the main process side and encrypted with Electron `safeStorage` when available.
- Stats view supports overview metrics, time filters, instrument filters, entry-rule filters, tag filters, per-instrument aggregation, and drilldown back to the trade list.
- Stats date filters support both user local day and market session day semantics.
- Backup view can export `app.sqlite`, attachments, and a manifest into a zip; restore validates the backup and creates a safety backup before replacement.
- Backup view lists backup history, exposes restore eligibility, and can restore directly from a known historical backup file.
- Settings includes a local data reset workflow with an exact `DELETE` confirmation; reset creates a safety backup before rebuilding an empty database and attachments directory.
- UI has been refreshed with a light blue desktop-workbench visual theme and friendlier Chinese user-facing copy.
- Shared desktop API contracts live under `shared/contracts` and are reused across Electron, preload, and renderer boundaries.
- Initial instrument presets: ES, MES, NQ, MNQ.
- Design spec and implementation plans are stored under `docs/superpowers`.

MVP does not support open trades. A trade is one complete trading plan, not a single execution fill.

Not implemented yet:

- Manual tag management UI and tag category editing are not implemented yet; AI tags currently normalize as `setup`.
- Initial packaging verification is still pending.
- AI prompt/schema fixture evals, retry/error classification, and usage/cost reporting are still pending.
- Instrument configuration management UI is not implemented yet; the first presets are still seeded locally.

## Development

Install dependencies:

```bash
npm install --cache .npm-cache
```

Run Electron desktop app:

```bash
npm run dev
```

Run browser-only renderer preview:

```bash
npm run web:dev
```

Run tests:

```bash
npm run test -- --run
```

Build renderer and Electron main/preload:

```bash
npm run build
```

## Toolchain Note

This project now uses Electron, so the MVP desktop shell runs on the Node/npm toolchain. Rust/Cargo is not required.

SQLite currently uses the Node/Electron built-in `node:sqlite` API. It avoids native module rebuild issues in Electron and keeps the first local data layer simple.
