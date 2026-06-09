# AI Trading Review

个人本地桌面 AI 交易复盘应用。第一版聚焦已平仓单笔交易：手动录入交易事实、上传截图和笔记、关联入场规则版本、生成结构化 AI 复盘、用户确认后进入统计。

## Current Scope

M1 has started:

- Tauri v2 + React + TypeScript + Vite scaffold.
- Desktop workbench shell with simple app-state navigation.
- Futures PnL/R multiple calculation core with Vitest coverage.
- Design spec and M1 implementation plan are stored under `docs/superpowers`.

MVP does not support open trades. A trade is one complete trading plan, not a single execution fill.

## Development

Install dependencies:

```bash
npm install --cache .npm-cache
```

Run frontend:

```bash
npm run dev
```

Run tests:

```bash
npm run test -- --run
```

Build frontend:

```bash
npm run build
```

Run Tauri after Rust/Cargo is installed:

```bash
npm run tauri dev
```

## Toolchain Note

This machine currently has Node/npm available, but `rustc` and `cargo` were not found during M1 setup. Frontend tests and Vite build can run now. Full Tauri desktop build requires installing Rust first.
