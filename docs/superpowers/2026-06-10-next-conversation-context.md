# AI 交易复盘项目 - 下个对话上下文

更新时间：2026-06-16

## 0. 当前进度快照

当前主线已完成本地桌面交易复盘 MVP 的主要闭环，并在最近两轮完成 UI/UX 体验打磨。

已完成并验证：

- 架构收敛：跨进程 DTO 已迁到 `shared/contracts`；交易、规则、复盘、附件、统计、备份/设置 workflow 已从 `src/App.tsx` 拆出到专用 hook。
- 统计口径：数据库 v2 已写入 `user_local_date` / `market_session_date`，统计筛选支持用户本地日和市场会话日。
- 备份恢复增强：备份历史列表、恢复资格状态、历史备份直接恢复、恢复失败友好指引已接入。
- UI 打磨：交易工作台改为淡蓝色桌面工具风格，侧栏、卡片、选中态、按钮、表单焦点和状态卡片统一。
- 文案打磨：空状态、错误提示、确认弹窗、保存/处理态、危险操作说明改为更友好的中文用户文案。
- 标签统计 / 筛选：confirmed/corrected AI 复盘标签会规范化写入 `tag` / `trade_tag_map`，统计页支持标签筛选和交易下钻。

最新验证：

- `npm run test -- --run`：45 files / 181 tests passed。
- `npm run lint`：passed。
- `npm run build`：passed。
- Electron 视觉冒烟：交易页淡蓝主题和新文案已通过 dev server 热更新显示。

下一步建议：

- 先 review 并提交当前文档更新（如需要）。
- 优先推进 AI 复盘硬化：prompt/schema fixture eval、错误分类、重试策略、使用量/成本展示。
- 并行或随后做初始打包验证，确认 Electron 打包后的本地数据、文件选择器、备份/恢复和 `safeStorage` 行为。

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
256796d polish app review workflow copy
adec01b docs: update development handoff
9145768 feat: add stats date semantics and workflow refactors
ed202f4 feat: restore backups from history
7f12e97 feat: show backup history and restore guidance
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

- AI 生成标签已在 confirmed/corrected 复盘后接入 `tag` / `trade_tag_map` 并进入统计筛选；人工标签管理和标签分类编辑尚未实现。
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

- 标签筛选和下钻已完成；按标签的图表化聚合和人工标签维护尚未完成。
- 按时间趋势、规则聚合、标签聚合图表还没完整接入。
- 日期口径已支持用户本地日和市场会话日，但还缺更丰富的趋势图表展示。
- ECharts 暂未接入，建议等统计口径稳定后再做。

### 5.7 备份恢复

已完成：

- `BackupService` 可导出标准 zip 备份包，包含 `app.sqlite`、`attachments/`、`manifest.json`。
- manifest 包含备份 schema 版本、app version、导出时间、文件列表和 sha256。
- 恢复前会自动生成当前数据安全备份。
- 恢复时校验 manifest、必需文件和 checksum。
- 备份页 UI 支持立即备份、选择 zip 恢复、打开数据目录、打开备份目录。
- 备份页 UI 支持备份历史列表、状态展示和从历史备份直接恢复。
- 恢复失败会根据 checksum、manifest、schema version 等常见问题给出更友好的恢复指引。
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
- 备份包未来版本迁移策略仍需随着 schema 演进继续完善。

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
- 交易页完成淡蓝色桌面工具主题刷新。
- 统计页、备份页、设置页已有可用 UI，并补齐备份历史、设置危险区和统计筛选的主要状态。
- 已补导航 `aria-current`、基础 hover/focus/selected 状态、移动端布局。
- 用户可见提示文本已完成一轮友好化：空状态、错误提示、确认弹窗、保存/处理态和危险操作说明都改为更明确的中文文案。

当前限制：

- `src/App.tsx` 已明显瘦身，但仍承担跨 workflow 编排和页面装配。
- 组件 props 仍偏多，后续可以继续拆 view model 或更细的容器组件。
- 真实长文本、长规则名、多附件、多复盘结果场景仍需继续 QA。

## 6. M1-M5 状态

按原始设计文档定义：

- M1 桌面骨架和本地数据：已完成。
- M2 交易记录闭环：已完成。
- M3 规则库：已完成最小闭环。
- M4 AI 复盘：主体完成，AI 生成标签已接入统计筛选；剩手动验收说明、eval、错误处理、使用量/成本等尾项。
- M5 统计和备份：主干完成，备份增强和标签筛选已完成第一轮；剩趋势/规则/标签图表聚合、人工标签管理、初始打包验证。

所以当前不能说 M1-M5 全部完成；更准确是：M1-M3 完成，M4/M5 主链路完成且部分增强已落地，但仍有 AI hardening、图表、人工标签管理和打包尾项。

## 7. 最近验证状态

当前工作树完整验证通过：

```bash
npm run test -- --run
npm run lint
npm run build
```

结果：

- Vitest：45 files / 181 tests passed。
- Lint：passed。
- Build：passed。
- Electron 视觉冒烟：交易页淡蓝主题、复盘状态卡片和用户友好文案已通过运行中 dev session 热更新显示。

## 8. 下一步推荐

优先级从高到低：

P0 收尾，关系到发布和长期安全使用：

- 初始打包验证：确认 Electron 打包、应用数据目录、`node:sqlite`、文件选择器、备份/恢复和 `safeStorage` 在打包后可用。
- 备份包未来版本迁移策略：当前已有 v1 恢复资格判断，后续 schema 变化时需要明确迁移路径。

P1 高价值功能，直接提升复盘和统计闭环：

- 统计图表和聚合：在已完成日期语义基础上，补按时间趋势、规则、标签聚合，并接入 ECharts。
- AI 复盘打磨：真实 API 手动验收脚本或开发说明、prompt/schema fixture eval、失败重试、错误分类、使用量/成本展示。
- 人工标签管理：补标签维护 UI、分类编辑和交易详情人工修正入口。

P2 工程收敛和体验打磨：

- 继续收敛 `src/App.tsx`：workflow hook 已拆出，后续可继续拆 view model 和页面容器，降低 prop 传递密度。
- 品种配置管理：ES/MES/NQ/MNQ 目前来自 seed，尚无 UI 管理点值、tick 配置。
- UI 深度 QA：规则页、统计页、备份页和设置页继续做真实长文本、多附件、多复盘结果场景验证。
- 在线图片标注：MVP 暂时接收用户外部标注后的图片。

P3 明确暂缓或不在当前 MVP 范围：

- CSV/券商导入、云同步、账号、多设备、移动端、open trade、回测。

推荐下一步：

```text
优先做“AI 复盘 hardening”或“初始打包验证”。
备选做“统计图表和聚合”。
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
- 跨进程 DTO 类型已经集中到 `shared/contracts`；新增 IPC 能力应继续优先放入 shared contract，避免再次漂移。
- `src/App.tsx` 已拆出主要 workflow hook；继续增加统计筛选、AI hardening、打包状态或设置增强时，优先保持局部 state 在对应 hook/view model。
- UI 是数据密集型桌面工作台，不要做营销式页面。
- MVP 当前不支持 open trade，文档和 UI 要持续说明这个边界。
