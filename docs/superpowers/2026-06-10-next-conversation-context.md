# AI 交易复盘项目 - 下个对话上下文

更新时间：2026-06-10

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

当前分支：`main`

最近一次人工记录的提交序列：

```text
d7fc313 docs: add next conversation handoff
3ce5d5c feat: add closed trade entry form
39a07aa feat: add closed trade persistence
6896f6d feat: add local sqlite foundation
61b3b3f refactor: migrate desktop shell to electron
578c67f docs: mark m1 foundation plan complete
486d236 chore: remove unused template assets
9f2c6fd feat: scaffold desktop trading review app
```

继续开发前应运行 `git status --short --branch` 和 `git log --oneline -8` 确认最新提交与工作区状态。

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
- 表单有客户端中文校验，先拦截无效数字、时间、止损方向等错误。
- `datetime-local` 会按用户本地时间解析后转 ISO，且会拒绝日期回绕。
- 点击“保存已平仓交易”可通过 Electron API 写入 SQLite。
- 保存后重新加载交易列表，选中新建交易，并重置下一笔表单。
- 当前支持从选中交易详情回填表单并编辑已平仓交易；更新后重新计算盈亏和成交明细。
- 当前支持删除选中交易，删除前会确认；SQLite 明细通过外键级联清理。
- 右侧 AI 复盘区域目前是基于 `ai_review_status` 的真实状态占位，不再展示静态假分数或假截图结论。

关键文件：

```text
src/App.tsx
src/App.css
src/app/views.ts
src/app/tradeForm.ts
src/app/tradeList.ts
src/app/reviewPanel.ts
```

## 7. 当前验证状态

最近一次完整验证通过：

```bash
npm run test -- --run
npm run build
npm run lint
```

结果：

- Vitest：10 files / 38 tests passed。
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
- “复制上一笔”按钮仍是占位入口，尚未接入行为。
- `src/App.tsx` 已经承载较多状态，继续做入场规则、AI 复盘或截图预览前应考虑拆分交易表单、列表和详情面板组件。

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
- 已完成 preload / IPC：支持选择本地图片并 attach，底层仍保留 `attachExistingFile`。
- 已完成 UI：选中交易详情里可选择截图类型、备注、通过系统文件选择器添加截图、列出附件、删除附件。
- 已完成交易删除时清理附件文件，避免 SQLite cascade 后留下孤儿图片。
- 待完成：安全的内联图片预览或受控本地图片协议，让 UI 显示缩略图/大图，而不是只显示本地路径。
- 暂不做在线画线和标注，MVP 接收用户外部标注后的图片。

### 9.4 入场规则库

目标：让每笔交易能绑定具体规则版本。

建议任务：

- `RuleService`。
- 新增规则。
- 创建不可变规则版本。
- 交易录入时选择 `entry_rule_version_id`。
- 后续 AI 复盘根据规则 checklist 判断执行一致性。

### 9.5 AI 复盘草稿

目标：从交易事实、截图、规则版本生成结构化复盘。

建议任务：

- `ReviewService`。
- 设计 AI prompt 输入结构。
- 输出结构写入 `ai_review` 和 `trade_rule_check`。
- UI 展示 AI 草稿。
- 用户确认、修正、标记无效。
- 只有 confirmed/corrected 数据进入统计。

### 9.6 统计面板

目标：基于已确认数据做基础统计。

建议任务：

- `StatsService`。
- 按时间、品种、规则、标签聚合。
- ECharts 接入。
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

当前目标：在现有 Electron + React + SQLite 基础上继续开发 AI 交易复盘 MVP。请先检查 git 状态和现有代码，不要重置或删除本地数据库。优先从“交易表单产品化 / 交易详情 / 附件截图 / 入场规则库”中选择下一步，并保持测试通过。
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
- UI 目前是早期工作台，不要过早做复杂营销式页面。
- MVP 当前不支持 open trade，但文档必须持续说明这个边界。
