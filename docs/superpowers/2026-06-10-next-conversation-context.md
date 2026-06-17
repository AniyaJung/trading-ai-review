# AI 交易复盘项目 - 新对话入口

更新时间：2026-06-17

## 0. 当前状态

这是一个个人本地桌面 AI 交易复盘应用，不是 Web SaaS。目标产品面是 Electron 桌面 App；Vite browser preview 只作为开发预览，不作为需要维护的产品面。

当前主线已经完成本地桌面 MVP 的核心闭环：

```text
手动录入已平仓交易
  -> 添加截图和笔记
  -> 关联入场规则版本
  -> 生成结构化 AI 复盘
  -> 用户确认/修正
  -> 进入统计分析
  -> 本地备份/恢复保护数据
```

当前分支：

```text
codex/safe-attachment-preview
```

继续新对话前先运行：

```bash
git status --short --branch
git log --oneline -12
sed -n '1,260p' docs/superpowers/2026-06-12-architecture-optimization-backlog.md
```

重要安全约束：

- 不要回退用户未要求回退的改动。
- 不要擅自删除、重置或清空真实本地 SQLite / app data。
- 涉及 reset、restore、migration、packaged smoke 的测试必须使用临时目录。

## 1. 最新进度快照

已完成并验证的主要工作：

- Electron + React + TypeScript + Vite 桌面应用主链路可用。
- 本地 SQLite schema 当前 supported database version 为 `3`。
- `user_local_date` / `market_session_date` 已写入交易表，统计支持用户本地日和市场会话日。
- confirmed/corrected AI 复盘标签会规范化写入 `tag` / `trade_tag_map`。
- `trade_tag_map.source` 已区分 `ai_review` / `manual`，AI tag sync 只重写 AI-owned mappings。
- AI review adapter 已拆分为 prompt/schema/client/response/error 模块，并包含 retryable 408/429/5xx/network 错误分类、fixture eval、usage metadata 保留和 UI 展示。
- Stats 查询边界已拆到 `statsFilters.ts` / `statsAggregates.ts`。
- Shared desktop contracts 已按 domain 拆分，`shared/contracts/desktopApi.ts` 保持公共聚合入口。
- `src/App.tsx` 已拆出 workflow hooks、`AppWorkspaceView` 和 `TradeDeskView`，但仍承担较多跨 workflow 编排。
- 备份/设置 workflow、附件 workflow、review workflow、trade/rule/stats workflow 均已从 `App.tsx` 拆出。
- 备份恢复和本地 reset 已共享 destructive operation lifecycle。
- 备份历史、恢复资格、历史备份恢复、恢复失败指引和 restore button disabled reason 已接入。
- 备份/设置样式已从 `src/App.css` 拆到 `src/styles/backup-settings.css`。
- 本地 unsigned macOS directory package smoke path 已存在：`npm run pack:dir` 和 `npm run smoke:packaged`。

最新验证基线：

```bash
npm run test -- --run
npm run lint
npm run build
```

最近一次完整验证结果：

- Vitest：49 files / 202 tests passed。
- Lint：passed。
- Build：passed。

最近一次 packaged smoke 结果：

- `npm run pack:dir` / `npm run smoke:packaged` 已验证 unsigned local app startup、临时 `userData`、SQLite migration v3、backup zip creation 和 `safeStorage`。
- 这个 smoke 不触碰真实 app data。
- Release packaging、签名/公证、DMG/ZIP 分发仍未完成；这不是当前立即执行的下一条线。

## 2. 当前技术栈

- 桌面壳：Electron。
- Renderer：React + TypeScript + Vite。
- 图标：lucide-react。
- 数据库：Electron/Node 内置 `node:sqlite`。
- 测试：Vitest。
- Lint：ESLint。
- AI：OpenAI Responses API，多模态结构化输出。
- 打包 smoke：自定义 `scripts/package-dir.mjs` + `scripts/smoke-packaged-app.mjs`。

已知技术注意点：

- `node:sqlite` 会在测试中输出 `ExperimentalWarning`，这是当前接受的已知现象。
- 正式 release 前仍需决定是否保留 `node:sqlite`，以及选择 electron-builder / Forge / 其它签名公证流程。
- 不要重新引入 browser-preview Playwright/e2e，除非浏览器预览被明确升级为受支持产品面。

## 3. 当前代码结构要点

核心 Electron 层：

```text
electron/main.ts
electron/preload.ts
electron/data/appData.ts
electron/data/database.ts
electron/ipc/*
electron/services/*
```

核心 shared contracts：

```text
shared/contracts/commonContracts.ts
shared/contracts/databaseContracts.ts
shared/contracts/tradeContracts.ts
shared/contracts/ruleContracts.ts
shared/contracts/reviewContracts.ts
shared/contracts/attachmentContracts.ts
shared/contracts/statsContracts.ts
shared/contracts/backupContracts.ts
shared/contracts/settingsContracts.ts
shared/contracts/desktopApi.ts
```

核心 renderer 结构：

```text
src/App.tsx
src/app/*Workflow.ts
src/app/*Panel.ts
src/components/*
src/styles/backup-settings.css
```

打包 smoke：

```text
scripts/package-dir.mjs
scripts/smoke-packaged-app.mjs
docs/superpowers/packaging-verification.md
```

## 4. 当前不活跃事项

除非用户明确恢复，不要把这些作为下一步：

- Browser-preview Playwright/e2e coverage。
- Release packaging、签名/公证、DMG/ZIP 分发。
- packaged UI 手工检查。
- AI cost 估算的硬编码价格展示。

这些不是取消，只是当前不是立即执行的下一条线。

## 5. 推荐下一步

下一轮新对话建议优先做：

```text
提取下一个 stateful desktop App feature container，建议从 BackupSettingsContainer 开始。
```

原因：

- `useBackupSettingsWorkflow` 已经隔离 state/actions。
- `BackupView` 和 `SettingsView` 已经是独立视图组件。
- 备份/设置 CSS 也已经独立到 `src/styles/backup-settings.css`。
- 这一刀可以继续降低 `src/App.tsx` 的 props 拼装和跨 workflow 编排密度。

建议执行方式：

1. 先写一个简短计划到 `docs/superpowers/plans/YYYY-MM-DD-backup-settings-container.md`。
2. 保持 `App.tsx` 顶层 shell/router 职责，不改产品行为。
3. 新增 `src/components/BackupSettingsContainer.tsx` 或更合适的 feature container 文件。
4. 尽量复用现有 `useBackupSettingsWorkflow` 和现有 `BackupView` / `SettingsView` props。
5. 先跑现有 backup/settings workflow 和 panel tests，再跑全量验证。

推荐验证：

```bash
npm run test -- --run
npm run lint
npm run build
git diff --check
```

## 6. 常用命令

安装依赖：

```bash
npm install --cache .npm-cache
```

启动桌面应用：

```bash
npm run dev
```

只启动 browser preview：

```bash
npm run web:dev
```

跑测试：

```bash
npm run test -- --run
```

Lint：

```bash
npm run lint
```

构建：

```bash
npm run build
```

本地 directory package smoke：

```bash
npm run pack:dir
npm run smoke:packaged
```

注意：`pack:dir` / `smoke:packaged` 是本地验证路径，不是 release 分发流程。

## 7. 范围外或后续事项

- Manual tag management UI 和 tag category editing。
- Instrument configuration management UI。
- 统计图表和更多 chart datasets。
- Release packaging / signing / notarization。
- CSV/券商导入。
- 云同步、账号、多设备、移动端。
- Open trade lifecycle 和回测。
