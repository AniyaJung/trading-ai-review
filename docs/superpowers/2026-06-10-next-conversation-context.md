# AI 交易复盘项目 - 下个对话上下文

更新时间：2026-06-12

## 0. 当前进度快照

当前工作树已完成“本地数据重置最小闭环”，但尚未提交。

已完成并验证：

- 备份恢复主链路：导出 zip、校验 manifest/checksum、恢复前安全备份。
- AI 设置页：保存 API Key、模型、Prompt 版本；API Key 不回显，Electron 可用时用 `safeStorage`。
- 本地数据重置入口：设置页危险区要求精确输入 `DELETE`，执行前自动创建 safety backup，然后重建空 SQLite 和 attachments 目录；浏览器预览模式始终禁用重置按钮。

最新验证：

- `npm run test -- --run`：32 files / 132 tests passed。
- `npm run lint`：passed。
- `npm run build`：passed。
- 浏览器视觉冒烟：设置页危险区在桌面和 390px 窄屏可见，无横向溢出；预览模式下输入 `DELETE` 后重置按钮仍禁用。

下一步建议：

- 先 review 并提交当前本地数据重置与文档更新。
- 继续 P0“备份恢复增强”：备份历史列表、恢复失败友好指引、备份包版本迁移策略 UI。

## 1. 项目定位

这是一个个人本地桌面 AI 交易复盘应用，不是 Web SaaS。

第一版目标是让用户在本机长期、稳定地记录已平仓交易，上传截图和笔记，关联入场规则版本，生成结构化 AI 复盘，用户确认或修正后进入统计分析。

核心闭环：

```text
手动录入一笔已平仓交易
  -> 上传交易截图和笔记
  -> 关联入场规则版本
  -> 生成 AI 复盘
  -> 用户确认或修正
  -> 进入统计分析
```

关键产品边界：

- MVP 只支持已平仓交易，不支持 open trade、持仓中笔记或持仓复盘。
- 一笔交易的边界是“一次完整交易计划”，不是单个成交回报。
- 底层保留 `trade_execution` 明细模型，后续可支持分批入场、加仓、减仓、分批止盈。
- 第一批重点品种是美股股指期货：ES、MES、NQ、MNQ。
- 本地优先，不做账号、云同步、多设备冲突、订阅支付、移动端。
- 图片存本地应用数据目录，数据库只保存路径和元数据。

## 2. 当前技术栈

- 桌面壳：Electron。
- Renderer：React + TypeScript + Vite。
- 图标：lucide-react。
- 数据库：Node/Electron 内置 `node:sqlite`。
- 测试：Vitest。
- Lint：ESLint。
- 未来图表：ECharts。
- AI：OpenAI Responses API，多模态结构化输出。

为什么暂用 `node:sqlite`：

- 避免 `better-sqlite3` 一类 native module 在 Electron 里 rebuild 的复杂度。
- 当前测试和开发可用。
- 测试会出现 `ExperimentalWarning: SQLite is an experimental feature and might change at any time`，这是已知现象。
- 正式打包前可以重新评估是否保留 `node:sqlite`，或迁移到更稳定的 SQLite driver。

## 3. 代码库和 Git 状态

项目目录：

```text
/Users/juyu/IdeaProjects/trading-ai-review
```

主要设计文档：

```text
docs/superpowers/specs/2026-06-09-ai-trading-review-design.md
```

当前分支：

```text
codex/safe-attachment-preview
```

最新功能提交：

```text
5ebaeae feat: add backup restore and ai settings
db34c60 style: refine trading workspace UI
1cf5b14 docs: update m4 m5 handoff
```

继续开发前必须运行：

```bash
git status --short --branch
git log --oneline -8
```

重要约束：

- 不要回退用户未要求回退的改动。
- 不要擅自删除、重置或清空本地 SQLite / app data。
- 如果要做数据清理或重置功能，必须使用临时目录测试，不得误碰真实应用数据。

## 4. 本地数据路径

本地应用数据目录：

```text
~/Library/Application Support/AI Trading Review/
```

当前主要路径：

```text
~/Library/Application Support/AI Trading Review/app.sqlite
~/Library/Application Support/AI Trading Review/attachments/
~/Library/Application Support/AI Trading Review/backups/
```

历史开发残留目录可能存在：

```text
~/Library/Application Support/Electron/
```

这是早期未设置 app name 前 Electron 可能创建的目录。不要擅自删除，除非用户明确要求清理。

## 5. 当前已完成能力

### 5.1 桌面壳和 SQLite 基础

已完成：

- Electron + React + TypeScript + Vite 项目可运行。
- `npm run dev` 同时启动 Vite 和 Electron。
- Main Window 默认启用 `contextIsolation`，关闭 `nodeIntegration`。
- Renderer 通过 preload 暴露窄 API 访问桌面能力。
- 初始化 SQLite schema，使用 `pragma user_version = 1` 管理迁移版本。
- 种子品种：ES、MES、NQ、MNQ。
- `instrument.point_value` 是盈亏、计划风险和 R 倍数计算的权威配置来源。

关键文件：

```text
electron/main.ts
electron/preload.ts
electron/data/appData.ts
electron/data/database.ts
electron/ipc/databaseIpc.ts
```

### 5.2 交易记录闭环

已完成：

- 期货 PnL/R 计算模块在 `shared/trading/`，Renderer 和 Main Process 共用。
- `TradeService` 可创建、读取、列出、更新、删除已平仓交易。
- 创建和更新交易时自动生成 entry / exit 两条 `trade_execution`。
- 删除交易时同步清理该交易已复制到附件目录的截图文件。
- 表单支持中文校验、本地 `datetime-local` 转 ISO、保存后刷新列表并选中新交易。
- 交易表单实时预览从 SQLite `instrument.point_value` 读取点值，不再在前端硬编码 ES/MES/NQ/MNQ。
- 交易支持绑定 active 规则的 latest version。

关键 IPC：

```text
window.desktopApi.trades.list()
window.desktopApi.trades.get(id)
window.desktopApi.trades.createClosed(input)
window.desktopApi.trades.update(id, input)
window.desktopApi.trades.delete(id)
```

关键文件：

```text
shared/trading/futuresMath.ts
electron/services/tradeService.ts
electron/ipc/tradeIpc.ts
src/app/tradeForm.ts
src/components/TradeFormPanel.tsx
```

### 5.3 附件和截图

已完成：

- `AttachmentService` 可从已有图片路径复制文件到 app data `attachments` 目录。
- 支持图片类型：`before_entry`、`entry`、`holding`、`exit`、`review_marked`。
- 可列出、添加、读取 data URL、删除附件。
- UI 支持系统文件选择器添加截图、缩略图、大图预览、删除附件。
- Renderer 不直接裸用任意本地文件路径作为图片源，而是通过附件 id 请求 data URL。

关键 IPC：

```text
window.desktopApi.attachments.listByTrade(tradeId)
window.desktopApi.attachments.chooseAndAttach(input)
window.desktopApi.attachments.readImageDataUrl(id)
window.desktopApi.attachments.delete(id)
```

关键文件：

```text
electron/services/attachmentService.ts
electron/ipc/attachmentIpc.ts
src/app/attachmentPanel.ts
src/components/AttachmentSection.tsx
```

### 5.4 入场规则库

已完成：

- `RuleService` 可创建 active 入场规则，并自动生成不可变 v1。
- 可追加规则版本，旧版本不被覆盖。
- 可列出 active 规则及 latest version。
- 可归档规则，历史绑定不受影响。
- 交易创建和编辑时可绑定 `entry_rule_version_id`。
- 交易详情展示绑定的规则版本、内容和 checklist。

关键 IPC：

```text
window.desktopApi.rules.listActive()
window.desktopApi.rules.create(input)
window.desktopApi.rules.createVersion(input)
window.desktopApi.rules.archive(id)
```

关键文件：

```text
electron/services/ruleService.ts
electron/ipc/ruleIpc.ts
src/app/rulePanel.ts
src/components/RulesView.tsx
```

### 5.5 AI 复盘

已完成：

- `ReviewService` 可创建、读取、确认、修正、标记无效复盘草稿。
- 复盘状态会同步回 `trade.ai_review_status`。
- 创建草稿时从绑定规则 checklist 生成 `trade_rule_check` 默认 `unknown` 项。
- UI 可展示和人工编辑单条规则检查结果。
- `AIReviewService` + `OpenAIReviewAdapter` 通过 OpenAI Responses API 发送交易事实、规则 checklist 和附件 data URL。
- 使用 Structured Outputs 解析结构化复盘。
- AI 生成结果写入 `ai_review`，并按 `checkItem` 回填 `trade_rule_check.result/evidence/comment/score_delta`。
- API Key 只在 Main Process 读取，优先使用设置页保存在本机的 Key，缺省回退 `OPENAI_API_KEY`。
- 模型优先使用设置页配置，缺省回退 `OPENAI_MODEL`，默认 `gpt-5.5`。

关键 IPC：

```text
window.desktopApi.reviews.generateDraft(tradeId)
window.desktopApi.reviews.getLatestForTrade(tradeId)
window.desktopApi.reviews.confirm(id)
window.desktopApi.reviews.correct(id, input)
window.desktopApi.reviews.invalidate(id)
window.desktopApi.reviews.updateRuleCheck(id, input)
```

关键文件：

```text
electron/services/aiReviewService.ts
electron/services/openAiReviewAdapter.ts
electron/services/reviewService.ts
electron/ipc/reviewIpc.ts
src/app/reviewPanel.ts
src/components/TradeReviewPanel.tsx
```

M4 尾项：

- AI 生成标签还没有真正接到 `tag` / `trade_tag_map`，也尚未进入统计闭环。
- 还缺真实 API 调用的手动验收脚本或开发说明，避免测试中打远程 API。
- 还缺 prompt/schema fixture eval。
- 后续可补失败重试、错误分类、使用量/成本展示。

### 5.6 统计面板

已完成：

- `StatsService` 返回统计总览。
- 统计 IPC / preload API。
- 统计视图接入左侧“统计”导航。
- 总览指标：总交易数、已确认复盘数、总净盈亏、胜率、平均 R、profit factor、总手续费。
- 按品种聚合。
- 时间范围筛选：全部、最近 7 天、最近 30 天、自定义起止日期。
- 品种筛选。
- 入场规则筛选。
- 从统计页“查看交易”或按品种聚合行下钻到交易列表。

当前统计口径：

- `totalTradeCount` 统计全部已平仓交易。
- `confirmedReviewCount` 统计 `confirmed` / `corrected` 复盘交易数。
- 总净盈亏、胜率、平均 R、profit factor、总手续费和按品种聚合只纳入 `confirmed` / `corrected` 复盘交易。
- 时间、品种、规则筛选会同时影响 `totalTradeCount` 和已确认复盘绩效指标。

关键文件：

```text
electron/services/statsService.ts
electron/ipc/statsIpc.ts
src/app/statsPanel.ts
src/components/StatsView.tsx
```

M5 统计尾项：

- 标签统计 / 筛选尚未完成。
- 按时间、规则、标签聚合还没完整接入。
- 当前日期口径仍基于 `opened_at` UTC 边界，尚未建模“用户本地日 + 市场会话日”。
- ECharts 暂未接入，建议等统计口径稳定后再做。

### 5.7 备份恢复

已完成：

- `BackupService` 可导出标准 zip 备份包，包含 `app.sqlite`、`attachments/`、`manifest.json`。
- manifest 包含备份 schema 版本、app version、导出时间、文件列表和 sha256。
- 恢复前会自动生成当前数据安全备份。
- 恢复时校验 manifest、必需文件和 checksum。
- 备份页 UI 支持立即备份、选择 zip 恢复、打开数据目录、打开备份目录。
- 浏览器预览模式禁用本地文件操作按钮。
- 设置页支持本地数据重置：必须输入 `DELETE`，并在执行前自动创建安全备份；重置后会重建干净 SQLite 和 attachments 目录。

关键 IPC：

```text
window.desktopApi.backup.create()
window.desktopApi.backup.chooseAndRestore()
window.desktopApi.backup.openDataDirectory()
window.desktopApi.backup.openBackupsDirectory()
window.desktopApi.settings.resetLocalData({ confirmationText: "DELETE" })
```

关键文件：

```text
electron/services/backupService.ts
electron/services/dataResetService.ts
electron/ipc/backupIpc.ts
electron/ipc/settingsIpc.ts
src/app/backupPanel.ts
src/components/BackupView.tsx
```

M5 备份和数据管理尾项：

- 初始打包验证仍未完成。
- 后续增强：备份历史列表、恢复失败后的更友好指引、备份包版本迁移策略 UI。

### 5.8 设置页

已完成：

- `SettingsService` 基于 `app_setting` 保存 AI 模型、Prompt 版本和本机 API Key 状态。
- Electron 可用时 API Key 使用 `safeStorage` 加密。
- 设置摘要不会回显明文 API Key。
- 设置页 UI 可保存 AI Key、模型、Prompt 版本。
- 设置页展示数据目录、SQLite、截图目录、备份目录。
- 设置页可打开数据目录和备份目录。
- 设置页危险区支持本地数据重置；必须输入 `DELETE`，执行前会自动创建安全备份。
- 浏览器预览模式禁用本地设置写入和打开目录按钮。

关键 IPC：

```text
window.desktopApi.settings.getSummary()
window.desktopApi.settings.saveAI(input)
window.desktopApi.settings.resetLocalData({ confirmationText: "DELETE" })
window.desktopApi.settings.openDataDirectory()
window.desktopApi.settings.openBackupsDirectory()
```

关键文件：

```text
electron/services/settingsService.ts
electron/services/secretCodec.ts
electron/services/dataResetService.ts
electron/ipc/settingsIpc.ts
src/app/settingsPanel.ts
src/components/SettingsView.tsx
```

### 5.9 UI 结构

已完成：

- 左侧导航：交易、规则、统计、备份、设置。
- 主工作台 UI 已拆分到 `src/components`。
- 交易页完成第一轮 data-dense dashboard 风格优化。
- 统计页、备份页、设置页已有最小可用 UI。
- 已补导航 `aria-current`、基础 hover/focus/selected 状态、移动端布局。

当前限制：

- `src/App.tsx` 仍然较长，状态和 Electron runtime 副作用仍集中。
- 组件 props 仍偏多，后续可以继续拆 hooks 或 view model。
- 真实长文本、长规则名、多附件、多复盘结果场景仍需继续 QA。

## 6. M1-M5 状态

按原始设计文档定义：

- M1 桌面骨架和本地数据：已完成。
- M2 交易记录闭环：已完成。
- M3 规则库：已完成最小闭环。
- M4 AI 复盘：主体完成，剩 AI 生成标签落库/统计、手动验收说明、eval、错误处理等尾项。
- M5 统计和备份：主干完成，剩标签统计、初始打包验证和备份增强。

所以当前不能说 M1-M5 全部完成；更准确是：M1-M3 完成，M4/M5 主链路完成但仍有尾项。

## 7. 最近验证状态

当前工作树（含备份恢复、AI 设置和本地数据重置入口）完整验证通过：

```bash
npm run test -- --run
npm run lint
npm run build
```

结果：

- Vitest：32 files / 132 tests passed。
- Lint：passed。
- Build：passed。
- 浏览器视觉冒烟：备份页、设置页和设置页危险区在桌面与 390px 窄屏都可见，无横向溢出；浏览器预览模式下即使输入 `DELETE`，重置按钮仍保持禁用。

## 8. 下一步推荐

优先级从高到低：

P0 必须补齐，关系到本地工具长期安全使用：

- 备份恢复增强：备份历史列表、恢复失败后的更友好指引、备份包版本迁移策略 UI。

P1 高价值功能，直接提升复盘和统计闭环：

- 标签统计 / 筛选：先明确 AI tags 如何落库或人工标签如何维护，再接统计筛选和交易下钻。
- 统计日期口径：实现“用户本地日 + 市场会话日”，兼容美股期货跨自然日。
- AI 复盘打磨：真实 API 手动验收脚本或开发说明、prompt/schema fixture eval、失败重试、错误分类、使用量/成本展示。

P2 工程收敛和体验打磨：

- 跨进程 DTO 迁移到 `shared/`：`StatsOverview`、`StatsOverviewFilters`、附件、复盘、备份和设置相关类型仍散落在 Electron service、Renderer helper 和 `src/vite-env.d.ts`。
- 拆分 `src/App.tsx`：可逐步拆 `useTradesState`、`useStatsState`、`useRulesState`、`useReviewState`、`useBackupState`、`useSettingsState`。
- 品种配置管理：ES/MES/NQ/MNQ 目前来自 seed，尚无 UI 管理点值、tick 配置。
- UI 深度打磨：规则页、统计页、备份页和设置页继续做真实长文本 QA。
- ECharts 图表：等规则/标签筛选、下钻和统计口径稳定后再接。
- 在线图片标注：MVP 暂时接收用户外部标注后的图片。

P3 明确暂缓或不在当前 MVP 范围：

- CSV/券商导入、云同步、账号、多设备、移动端、open trade、回测。

推荐下一步：

```text
优先做“备份恢复增强”或“标签统计/筛选”。
备选做“跨进程 DTO 迁移到 shared/”。
继续先写 Vitest，再实现。
不要删除或重置真实本地数据库。
```

## 9. 开发命令

安装依赖：

```bash
npm install --cache .npm-cache
```

启动桌面应用：

```bash
npm run dev
```

只启动浏览器预览：

```bash
npm run web:dev
```

跑测试：

```bash
npm run test -- --run
```

构建：

```bash
npm run build
```

Lint：

```bash
npm run lint
```

安全审计：

```bash
npm audit --cache .npm-cache
```

## 10. 给后续开发者的注意事项

- 不要回退用户未要求回退的改动。
- 不要擅自删除本地 SQLite 或 app data 目录。
- 新功能尽量先补 Vitest，再实现。
- Electron Renderer 不应直接访问 Node.js API。
- SQLite、文件系统、备份、附件、AI key 等都应放在 Electron Main Process。
- Preload 只暴露窄 API。
- 交易计算必须保持前后端一致，优先复用 `shared/trading/`。
- 品种点值必须以 SQLite `instrument.point_value` 为权威来源。
- 统计总览当前只纳入 `confirmed` / `corrected` 的复盘交易；新增筛选或图表时不要改变这个口径。
- 跨进程 DTO 类型后续建议放入 `shared/`，避免 Electron service、Renderer helper 和 `vite-env.d.ts` 重复定义后漂移。
- `src/App.tsx` 已经偏大；继续增加统计筛选、备份增强、设置增强或数据清理时，优先考虑拆分局部 state hook。
- UI 目前是早期工作台，不要做营销式页面。
- MVP 当前不支持 open trade，文档和 UI 要持续说明这个边界。
