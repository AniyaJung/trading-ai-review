# AI 交易复盘项目 - 下个对话上下文

更新时间：2026-06-11

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

## 2. 关键产品决策

- MVP 只支持已平仓交易，不支持 open trade、持仓中笔记或持仓复盘。
- 一笔交易的边界是“一次完整交易计划”，不是单个成交回报。
- 底层保留 `trade_execution` 明细模型，后续可支持分批入场、加仓、减仓、分批止盈。
- 第一批重点品种是美股股指期货：ES、MES、NQ、MNQ。
- 交易日统计后续应使用“用户本地日 + 市场会话日”的双字段思路，尤其要兼容美股期货跨自然日交易。
- 本地优先，不做账号、云同步、多设备冲突、订阅支付、移动端。
- 图片后续存本地应用数据目录，数据库只保存路径和元数据。

## 3. 当前技术栈

- 桌面壳：Electron。
- Renderer：React + TypeScript + Vite。
- 图标：lucide-react。
- 数据库：Node/Electron 内置 `node:sqlite`。
- 测试：Vitest。
- Lint：ESLint。
- 未来图表：ECharts。
- 未来 AI：远程多模态模型 API。

为什么是 Electron：

- 用户明确同意从早期 Tauri/Rust 思路切到 Electron。
- 当前 MVP 更适合 Node/npm 工具链，避免 Rust/Cargo 心智负担。
- 通过 Electron Main Process 处理 SQLite、文件系统、图片目录、备份恢复和系统安全能力。

为什么暂用 `node:sqlite`：

- 避免 `better-sqlite3` 一类 native module 在 Electron 里 rebuild 的复杂度。
- 当前测试和开发可用。
- 代价是测试会出现 `ExperimentalWarning: SQLite is an experimental feature and might change at any time`。
- 正式打包前可以重新评估是否保留 `node:sqlite`，或迁移到更稳定的 SQLite driver。

## 4. 代码库位置和重要文档

项目目录：

```text
/Users/juyu/IdeaProjects/trading-ai-review
```

主要设计文档：

```text
docs/superpowers/specs/2026-06-09-ai-trading-review-design.md
```

实施计划：

```text
docs/superpowers/plans/2026-06-09-m1-desktop-foundation.md
docs/superpowers/plans/2026-06-09-m2-local-data-foundation.md
docs/superpowers/plans/2026-06-09-m2-trade-record-service.md
```

本文档：

```text
docs/superpowers/2026-06-10-next-conversation-context.md
```

## 5. 当前 Git 进度

当前分支：`codex/safe-attachment-preview`

最近一次人工记录的提交序列：

```text
fdb2e1c feat: wire review draft resolution UI
e00f085 feat: add local ai review service
97ebcf7 feat: add rule binding review workspace
22c098b docs: update next conversation handoff
b301a3c feat: add trade screenshot attachments
53fe691 feat: add closed trade editing
1e6168a feat: improve trade record workflow
d7fc313 docs: add next conversation handoff
```

继续开发前应运行 `git status --short --branch` 和 `git log --oneline -8` 确认最新提交与工作区状态。

2026-06-11 本轮开发内容：

- 修复无选中交易时 `selectedTradeDetailState?.tradeId === selectedTrade?.id` 误判为 true 的运行时问题，避免桌面应用空状态启动时报 `Cannot read properties of undefined`。
- 新增 `src/app/tradeDetailSelection.ts`，集中处理选中交易详情、错误状态、附件错误和复盘错误的 tradeId 归属判断。
- 新增 `database:listInstruments` IPC / preload API，Renderer 启动时从 SQLite 读取 ES/MES/NQ/MNQ 品种配置。
- 移除 `src/app/tradeForm.ts` 内的前端 `pointValueBySymbol`，实时预览改用 `instrument.point_value`，保证表单预览和服务端保存计算使用同一个点值来源。
- 补充 `electron/ipc/databaseIpc.test.ts`、`src/app/tradeForm.test.ts` 和 `src/app/tradeDetailSelection.test.ts` 覆盖上述行为。

## 6. 已完成能力

### 6.1 Electron 桌面壳

已完成：

- Electron + React + TypeScript + Vite 项目可运行。
- `npm run dev` 同时启动 Vite 和 Electron。
- Electron 入口为 `dist-electron/electron/main.js`。
- Main Window 默认启用 `contextIsolation`，关闭 `nodeIntegration`。
- Renderer 通过 preload 暴露的窄 API 访问桌面能力。
- 修复了 Electron 编译目录变更后的生产 renderer 路径问题，并新增 `electron/runtimePaths.test.ts`。

关键文件：

```text
electron/main.ts
electron/preload.ts
electron/windowOptions.ts
electron/runtimePaths.ts
```

### 6.2 本地 SQLite 基础

已完成：

- 创建本地应用数据目录：

```text
~/Library/Application Support/AI Trading Review/
```

- SQLite 文件：

```text
~/Library/Application Support/AI Trading Review/app.sqlite
```

- 附件目录：

```text
~/Library/Application Support/AI Trading Review/attachments/
```

- 备份目录：

```text
~/Library/Application Support/AI Trading Review/backups/
```

- 初始化数据库 schema。
- 通过 `pragma user_version = 1` 管理当前迁移版本。
- 种子品种：ES、MES、NQ、MNQ。
- `instrument.point_value` 是服务端保存交易时计算盈亏、计划风险和 R 倍数的权威配置来源。

核心表：

```text
instrument
trade
trade_execution
entry_rule
entry_rule_version
trade_attachment
ai_review
trade_rule_check
tag
trade_tag_map
app_setting
```

关键文件：

```text
electron/data/appData.ts
electron/data/database.ts
electron/ipc/databaseIpc.ts
```

### 6.3 交易计算和持久化

已完成：

- 期货 PnL/R 计算模块迁移到 `shared/trading/`。
- Renderer 和 Electron Main Process 共用同一套计算逻辑。
- `TradeService` 可创建已平仓交易。
- 创建交易时会自动生成 entry 和 exit 两条 `trade_execution` 明细。
- `TradeService` 可按 `opened_at desc, id desc` 列出交易。
- `TradeService` 可读取单笔交易详情，包括止损、止盈、笔记字段和 entry/exit 成交明细。
- `TradeService` 可更新已平仓交易，更新时会重新计算 PnL/R 并重建 entry/exit 成交明细。
- `TradeService` 可删除交易，并依赖 SQLite 外键级联删除成交明细。
- 删除交易时会同步清理该交易已复制到附件目录的截图文件，避免 SQLite cascade 后留下孤儿图片。
- IPC 暴露：

```text
window.desktopApi.trades.list()
window.desktopApi.trades.get(id)
window.desktopApi.trades.createClosed(input)
window.desktopApi.trades.update(id, input)
window.desktopApi.trades.delete(id)
```

服务层当前校验：

- 方向必须是 `long` 或 `short`。
- 合约数必须是正整数。
- 入场价、出场价、止损价、止盈价必须是有限正数。
- 手续费必须是有限数，且不能为负。
- 开仓、平仓时间必须是有效 ISO timestamp。
- 平仓时间不能早于开仓时间。
- long 的止损必须低于入场价。
- short 的止损必须高于入场价。
- 未知品种会拒绝写入。

关键文件：

```text
shared/trading/futuresMath.ts
shared/trading/types.ts
electron/services/tradeService.ts
electron/ipc/tradeIpc.ts
src/vite-env.d.ts
```

### 6.4 当前 UI

已完成：

- 左侧导航：交易、规则、统计、备份、设置等初始入口。
- 交易列表：Electron runtime 下读取 SQLite 真实数据；浏览器预览下使用 sample data。
- Electron runtime 下加载真实数据前不再闪现 sample data。
- 交易列表支持选中交易；右侧显示选中交易详情。
- 单笔交易事实表单：
  - 品种
  - 方向
  - 开仓时间
  - 平仓时间
  - 入场点位
  - 出场点位
  - 止损点位
  - 止盈点位
  - 合约数
  - 手续费
  - 入场理由
  - 出场理由
- 表单实时预览净盈亏、R 倍数、计划风险。
- 表单实时预览已改为从 SQLite `instrument.point_value` 读取点值，不再在前端维护独立 ES/MES/NQ/MNQ 点值表。
- 表单有客户端中文校验，先拦截无效数字、时间、止损方向等错误。
- `datetime-local` 会按用户本地时间解析后转 ISO，且会拒绝日期回绕。
- 点击“保存已平仓交易”可通过 Electron API 写入 SQLite。
- 保存后重新加载交易列表，选中新建交易，并重置下一笔表单。
- 当前支持从选中交易详情回填表单并编辑已平仓交易；更新后重新计算盈亏和成交明细。
- 当前支持删除选中交易，删除前会确认；SQLite 明细通过外键级联清理。
- 右侧 AI 复盘区域目前是基于 `ai_review_status` 的真实状态占位，不再展示静态假分数或假截图结论。
- 无选中交易或详情尚未加载时，交易详情、附件错误和复盘错误状态不会再因为两个缺失 id 相等而误判为当前交易状态。

关键文件：

```text
src/App.tsx
src/App.css
src/app/views.ts
src/app/tradeForm.ts
src/app/tradeList.ts
src/app/reviewPanel.ts
```

### 6.5 交易截图附件

已完成：

- `AttachmentService` 可从已有图片路径复制文件到本地 app data `attachments` 目录。
- `AttachmentService` 会写入 `trade_attachment`，并保留图片类型、备注、排序和创建时间。
- 支持的图片类型：
  - `before_entry`
  - `entry`
  - `holding`
  - `exit`
  - `review_marked`
- 附件列表按 `sort_order asc, id asc` 排序。
- 删除单张附件时会删除数据库记录和本地复制文件。
- Electron IPC / preload 暴露：

```text
window.desktopApi.attachments.listByTrade(tradeId)
window.desktopApi.attachments.attachExistingFile(input)
window.desktopApi.attachments.chooseAndAttach(input)
window.desktopApi.attachments.readImageDataUrl(id)
window.desktopApi.attachments.delete(id)
```

- `chooseAndAttach` 通过 Electron `dialog.showOpenDialog` 选择本地图片，再复制到 app data 附件目录。
- 选中交易详情里已经可以选择截图类型、填写备注、添加截图、查看附件列表、删除附件。
- 选中交易详情里已经通过受控 preload API 读取已登记附件的 data URL，显示缩略图，并支持点击打开大图预览。

当前限制：

- Renderer 不直接裸用任意本地文件路径作为图片源；当前使用 `attachments:readImageDataUrl` 通过附件 id 读取数据库中已登记的本地副本。
- 附件相关类型目前分散在 Electron service、renderer helper 和 `src/vite-env.d.ts`，后续可抽到共享 contract，降低类型漂移风险。

关键文件：

```text
electron/services/attachmentService.ts
electron/ipc/attachmentIpc.ts
src/app/attachmentPanel.ts
src/App.tsx
src/vite-env.d.ts
```

### 6.6 入场规则库

已完成：

- `RuleService` 可创建 active 入场规则，并自动生成不可变 v1。
- `RuleService` 可追加规则版本，版本号按规则递增，旧版本不被覆盖。
- `RuleService` 可列出 active 规则及 latest version。
- `RuleService` 可归档规则；归档不会删除历史版本，也不会破坏历史交易绑定。
- 交易创建和编辑时可绑定 `entry_rule_version_id`，服务层会同步写入 `entry_rule_id`。
- 交易列表和交易详情会带回规则名称、版本号；交易详情会带回规则内容和 checklist。
- Electron IPC / preload 暴露：

```text
window.desktopApi.rules.listActive()
window.desktopApi.rules.create(input)
window.desktopApi.rules.createVersion(input)
window.desktopApi.rules.archive(id)
```

- UI 规则页可新建规则、追加版本、归档 active 规则。
- 交易表单可选择 active 规则的 latest version；交易详情展示绑定的规则版本、内容和 checklist。

当前限制：

- 规则编辑采用“追加版本”，不支持直接修改历史版本，这是刻意设计。
- 规则 UI 目前是最小可用版本，已经拆成组件，但还没有富文本、模板、标签或复杂 checklist 编辑器。
- 交易只能从 active 规则的 latest version 里选择；历史绑定版本会保留并展示，但 UI 暂不提供绑定 archived 规则旧版本的入口。

关键文件：

```text
electron/services/ruleService.ts
electron/ipc/ruleIpc.ts
electron/services/tradeService.ts
src/app/rulePanel.ts
src/app/tradeForm.ts
src/App.tsx
src/vite-env.d.ts
```

### 6.7 UI 结构拆分

已完成：

- `src/App.tsx` 继续负责应用级状态、副作用、IPC 调用和跨面板编排。
- 主工作台 UI 已拆分到 `src/components`：
  - `AppSidebar`
  - `AppTopbar`
  - `TradeListPanel`
  - `TradeFormPanel`
  - `TradeReviewPanel`
  - `AttachmentSection`
  - `RulesView`
- 交易列表、交易表单、交易详情/复盘区、附件区、规则库页面都已经从 `App.tsx` 移出。
- 当前拆分保持行为等价，未引入新 UI 框架，也没有大改视觉主题。

当前限制：

- `App.tsx` 仍然较长，因为状态管理和 Electron runtime 副作用仍集中在一个组件中。
- 组件 props 仍偏多，后续接 AI 复盘时可以继续拆服务 hooks 或 view model。
- 视觉效果还没有系统优化；当前只是结构拆分后的原样式迁移。

关键文件：

```text
src/components/AppSidebar.tsx
src/components/AppTopbar.tsx
src/components/TradeListPanel.tsx
src/components/TradeFormPanel.tsx
src/components/TradeReviewPanel.tsx
src/components/AttachmentSection.tsx
src/components/RulesView.tsx
src/App.tsx
```

### 6.8 本地 AI 复盘草稿闭环

已完成：

- `ReviewService` 可创建本地复盘草稿，并写入 `ai_review`。
- 可读取单笔交易最新复盘。
- 可确认草稿、修正草稿摘要、标记草稿无效。
- 复盘状态会同步回 `trade.ai_review_status`。
- Electron IPC / preload 暴露：

```text
window.desktopApi.reviews.createDraft(input)
window.desktopApi.reviews.getLatestForTrade(tradeId)
window.desktopApi.reviews.confirm(id)
window.desktopApi.reviews.correct(id, input)
window.desktopApi.reviews.invalidate(id)
```

- UI 右侧复盘区已经能展示本地草稿状态，并提供确认、修正、标记无效入口。
- 交易列表和交易详情会随复盘状态变化刷新。

当前限制：

- 还没有真正接入远程多模态 AI API。
- 目前草稿创建能力主要服务于本地状态闭环，尚未从截图、规则和交易事实自动生成结构化内容。
- `trade_rule_check` 表已存在，但规则逐项检查结果的写入和展示还没有完成。

关键文件：

```text
electron/services/reviewService.ts
electron/ipc/reviewIpc.ts
src/app/reviewPanel.ts
src/components/TradeReviewPanel.tsx
src/App.tsx
```

### 6.9 品种配置读取和预览计算

已完成：

- SQLite `instrument` 表继续作为品种配置来源。
- `database:listInstruments` IPC 可返回当前数据库中的品种配置。
- Preload 暴露 `window.desktopApi.database.listInstruments()`。
- Renderer 启动时加载品种配置，并传入交易表单。
- 交易表单品种下拉从数据库配置生成。
- 表单实时预览使用当前品种的 `pointValue` 计算净盈亏、计划风险和 R 倍数。

当前限制：

- UI 还没有提供“品种配置管理”页面；ES/MES/NQ/MNQ 仍由数据库 seed 初始化。
- 如果后续允许用户新增或修改品种，需要补充 instrument service、配置 UI 和迁移/校验策略。

关键文件：

```text
electron/ipc/databaseIpc.ts
electron/preload.ts
src/app/tradeForm.ts
src/components/TradeFormPanel.tsx
src/vite-env.d.ts
```

## 7. 当前验证状态

最近一次完整验证通过：

```bash
npm run test -- --run
npm run build
npm run lint
```

结果：

- Vitest：20 files / 80 tests passed。
- Build：passed。
- Lint：passed。

注意：测试和临时 Node 脚本中会出现 `node:sqlite` ExperimentalWarning，这是当前技术选型的已知现象。

## 8. 本机数据状态

本机开发数据库路径：

```text
/Users/juyu/Library/Application Support/AI Trading Review/app.sqlite
```

创建本文档前查询到：

```text
instrument count = 4
trade count = 7
latest trade id = 7
```

这些交易可能包含开发验证或手动测试数据。不要在未确认用户意图前自动删除或重置数据库。

另一个历史开发残留目录可能存在：

```text
~/Library/Application Support/Electron/
```

这是早期未设置 app name 前 Electron 可能创建的目录。不要擅自删除，除非用户明确要求清理。

## 9. 下一阶段建议

优先级从高到低：

### 9.0 下一步推荐

下个对话建议优先做 **统计面板最小闭环**。

原因：

- 交易事实、附件截图、规则绑定和本地复盘草稿确认/修正流程已经基本成型。
- `confirmed` / `corrected` 复盘状态已经有明确统计口径。
- 左侧已有“统计”入口，但还没有真实统计服务和 UI。
- 先做最小统计面板可以验证“记录 -> 复盘确认 -> 进入统计”的 MVP 闭环是否成立。

建议范围保持小：

- 新增 `StatsService`，只统计已平仓交易中的基础交易指标；如果涉及复盘口径，则只纳入 `ai_review_status in ('confirmed', 'corrected')` 的复盘指标。
- 先实现总览卡片：总交易数、已确认复盘数、总净盈亏、胜率、平均 R、profit factor、总手续费。
- 增加按品种聚合的简单列表，先不接 ECharts。
- 通过 IPC / preload 暴露只读统计 API。
- 在当前“统计”视图接入真实数据，空状态要明确说明“需要确认复盘后才进入 AI 复盘口径”。
- 新功能先补 Vitest，再实现。

视觉优化仍然重要，但建议放到统计面板最小闭环之后。若下个对话改做视觉优化，用户曾指定可使用：

```text
/Users/juyu/.agents/skills/ui-ux-pro-max/SKILL.md
```

### 9.1 交易表单产品化

目标：让“录入一笔已平仓交易”成为真正可日常使用的功能。

建议任务：

- 前端表单增加客户端校验和中文错误提示。
- 清理 `new Date(datetime-local).toISOString()` 的时区语义，明确本地时间录入如何转 UTC。
- 增加交易保存成功后的表单重置、复制上一笔、选择交易查看详情。
- 增加编辑和删除交易。
- 增加空状态、错误状态、加载状态。
- 增加 trade detail 视图，不要把所有功能塞在首页。

当前状态：

- 已完成客户端校验、时间解析、保存后重置、选择交易、详情读取、编辑交易、删除交易、加载/错误/空状态。
- 已完成交易录入和编辑时绑定 active 规则 latest version。
- 已完成表单实时预览从 Electron/SQLite 的 `instrument` 配置读取点值，避免前端预览和保存到数据库时使用不同的 `point_value`。
- “复制上一笔”按钮仍是占位入口，尚未接入行为。
- `src/App.tsx` 已经完成主要 UI 面板拆分，但仍承载较多状态和副作用；继续做 AI 复盘前可先做视觉整理，后续再按需要拆 hooks/view model。

### 9.2 交易日和市场会话日

目标：解决美股期货跨日统计问题。

建议数据字段：

```text
opened_at_utc
closed_at_utc
user_local_date
market_session_date
market_timezone
session_template
```

建议规则：

- 用户日用于个人行为复盘，例如“我今天做了什么”。
- 市场会话日用于交易策略统计，例如“这属于哪一个 ES/NQ regular session 或 globex session”。
- 不要只按用户本地自然日统计美股期货。

### 9.3 附件和截图

目标：每笔交易支持多张截图，这是 AI 复盘前的重要基础。

建议任务：

- 已完成 `AttachmentService`：复制已有图片到 app data attachments 目录、写入 `trade_attachment`、按交易列出、删除附件并清理文件。
- 已完成 `AttachmentService`：按附件 id 读取已登记图片文件并返回 data URL，用于安全预览。
- 已完成 preload / IPC：支持选择本地图片并 attach，底层仍保留 `attachExistingFile`。
- 已完成 UI：选中交易详情里可选择截图类型、备注、通过系统文件选择器添加截图、列出附件、删除附件。
- 已完成交易删除时清理附件文件，避免 SQLite cascade 后留下孤儿图片。
- 已完成安全的内联图片预览：renderer 通过附件 id 请求 data URL，UI 显示缩略图和大图预览，而不是直接把本地路径作为图片源。
- 暂不做在线画线和标注，MVP 接收用户外部标注后的图片。

### 9.4 入场规则库

目标：让每笔交易能绑定具体规则版本。

当前状态：

- 已完成 `RuleService`。
- 已完成新增规则和不可变规则版本。
- 已完成交易录入/编辑时选择 `entry_rule_version_id`。
- 已完成规则归档和 active latest version 列表。
- 后续 AI 复盘可根据绑定规则版本的 content/checklist 判断执行一致性。

### 9.5 AI 复盘草稿

目标：从交易事实、截图、规则版本生成结构化复盘。

当前状态：

- 本地 `ReviewService`、IPC、preload 和 UI 草稿状态处理已完成。
- 已支持本地草稿的读取、确认、修正摘要和标记无效。
- 尚未接入真实 AI API，也尚未写入 `trade_rule_check`。

建议任务：

- 设计 AI prompt 输入结构。
- 组装交易事实、截图 data、规则版本和 checklist。
- 接入远程多模态 AI API，并把模型/API key 做成本地设置。
- 输出结构写入 `ai_review` 和 `trade_rule_check`。
- UI 展示真实 AI 草稿、规则 checklist 判断和证据。
- 只有 confirmed/corrected 数据进入统计。

### 9.6 统计面板

目标：基于已确认数据做基础统计。

建议任务：

- `StatsService`。
- 先做总览指标和按品种聚合，再扩展按时间、规则、标签聚合。
- ECharts 放在基础服务和数据口径稳定之后接入。
- 核心指标：
  - 总交易数
  - 胜率
  - 总净盈亏
  - 平均 R
  - profit factor
  - 按规则的表现
  - 按标签的表现

### 9.7 备份恢复

目标：本地工具必须让用户放心长期使用。

建议任务：

- `BackupService`。
- 一键导出数据库和附件目录为 zip。
- 一键恢复前先做自动备份。
- 设置页提供数据目录打开、备份目录打开、清理/重置入口。

## 10. 下个对话推荐开场

可以把下面这段直接给下个 Codex 对话：

```text
请先阅读：

/Users/juyu/IdeaProjects/trading-ai-review/docs/superpowers/2026-06-10-next-conversation-context.md
/Users/juyu/IdeaProjects/trading-ai-review/docs/superpowers/specs/2026-06-09-ai-trading-review-design.md

项目目录：

/Users/juyu/IdeaProjects/trading-ai-review

当前目标：在现有 Electron + React + SQLite 基础上继续开发 AI 交易复盘 MVP。请先检查 git 状态和现有代码，不要重置或删除本地数据库。当前“交易事实 + 附件截图 + 入场规则版本绑定 + 本地复盘草稿确认/修正”链路已成型，表单预览已改为从 SQLite instrument 配置读取点值。建议下一步优先做“统计面板最小闭环”，并保持测试通过。

当前历史应至少包含这个基线提交；如果本轮改动已经提交，最新提交会在其后：

fdb2e1c feat: wire review draft resolution UI

建议下一步优先做“统计面板最小闭环”：

- 新增 StatsService。
- 新增统计 IPC / preload 只读 API。
- 统计视图展示总交易数、已确认复盘数、总净盈亏、胜率、平均 R、profit factor、总手续费和按品种聚合。
- 如果涉及 AI 复盘口径，只纳入 ai_review_status 为 confirmed/corrected 的交易。
- 先写 Vitest，再实现。
- 不要删除或重置本地数据库。
```

## 11. 开发命令

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

## 12. 给后续开发者的注意事项

- 不要回退用户未要求回退的改动。
- 不要擅自删除本地 SQLite 或 app data 目录。
- 新功能尽量先补 Vitest，再实现。
- Electron renderer 不应直接访问 Node.js API。
- SQLite、文件系统、备份、附件、AI key 等都应放在 Electron Main Process。
- Preload 只暴露窄 API。
- 交易计算必须保持前后端一致，优先复用 `shared/trading/`。
- 品种点值必须以 SQLite `instrument.point_value` 为权威来源，不要在 Renderer 重新硬编码 ES/MES/NQ/MNQ 点值表。
- UI 目前是早期工作台，不要过早做复杂营销式页面。
- MVP 当前不支持 open trade，但文档必须持续说明这个边界。
