# AI Trading Review

个人本地桌面 AI 交易复盘应用。第一版聚焦已平仓单笔交易：手动录入交易事实、上传截图和笔记、关联入场规则版本、生成结构化 AI 复盘、用户确认后进入统计。

## Current Scope

M1 has started:

- Electron + React + TypeScript + Vite scaffold.
- Desktop workbench shell with simple app-state navigation.
- Futures PnL/R multiple calculation core with Vitest coverage.
- Local SQLite database initialization in the Electron main process.
- Initial instrument presets: ES, MES, NQ, MNQ.
- Design spec and M1 implementation plan are stored under `docs/superpowers`.

MVP does not support open trades. A trade is one complete trading plan, not a single execution fill.

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
