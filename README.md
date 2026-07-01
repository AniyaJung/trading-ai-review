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
- AI review prompt/schema/client/response/error boundaries are split, with fixture coverage, retryable error classification, and usage metadata display.
- Stats SQL helpers are split into focused filter and aggregate modules.
- Backup/settings styles are split into `src/styles/backup-settings.css`.
- Unsigned local macOS directory packaging and smoke verification are available through `npm run pack:mac:dir` / `npm run pack:dir` and `npm run smoke:packaged`.
- Unsigned Windows x64 portable ZIP packaging is available through `npm run pack:win:x64` for manual Windows trial runs.
- Initial instrument presets: ES, MES, NQ, MNQ.
- Current handoff, architecture backlog, packaging notes, and design specs are stored under `docs/superpowers`.

MVP does not support open trades. A trade is one complete trading plan, not a single execution fill.

Not implemented yet:

- Manual tag management UI and tag category editing are not implemented yet; AI tags currently normalize as `setup`.
- Signed/notarized release packaging and installer artifacts are not implemented yet.
- Packaged UI manual checks remain to be done for native file picker, attachment preview, backup restore, and AI key relaunch/decrypt.
- Configurable AI pricing or billing import is not implemented yet; provider cost metadata is displayed only when available.
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

Run the standard local verification suite:

```bash
npm run verify
```

Create and smoke-test an unsigned local macOS directory package:

```bash
npm run pack:mac:dir
# or the legacy alias:
npm run pack:dir
npm run smoke:packaged
```

Create an unsigned Windows x64 portable ZIP:

```bash
npm run pack:win:x64
```

The Windows package is generated at:

```text
release/AI Trading Review-win32-x64-portable.zip
```

Both packaging paths are for local runtime verification and trial use, not release distribution. The Windows ZIP is not signed and may trigger SmartScreen on first launch.

### Windows portable uninstall and update

The Windows package is a portable ZIP, not an installer. It does not register an uninstall entry in Windows Settings.

To uninstall only the app files:

1. Close AI Trading Review.
2. Delete the extracted `AI Trading Review-win32-x64-portable` folder.

This does not delete your trading data. Electron stores app data under the Windows user profile, normally:

```text
%APPDATA%\AI Trading Review
```

That directory contains the SQLite database, attachments, backups, and local settings. To remove local trading data before uninstalling, use the app's Settings reset flow or delete that directory manually after exporting a backup.

To update the portable app:

1. Export a backup from the Backup page.
2. Close AI Trading Review.
3. Extract the new ZIP to a fresh folder, or replace the old extracted app folder.
4. Launch `AI Trading Review.exe`.

The app data directory is separate from the portable app folder, so normal updates keep existing trades, attachments, backups, and settings. Database migrations run at startup when a newer app version needs them.

## Toolchain Note

This project now uses Electron, so the MVP desktop shell runs on the Node/npm toolchain. Rust/Cargo is not required.

SQLite currently uses the Node/Electron built-in `node:sqlite` API. It avoids native module rebuild issues in Electron and keeps the first local data layer simple.
