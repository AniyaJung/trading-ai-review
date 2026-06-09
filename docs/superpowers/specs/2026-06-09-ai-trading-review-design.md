# AI 交易复盘桌面应用设计文档

## 1. 概述

本项目是一个个人使用的 AI 交易复盘桌面工具。第一版以“单笔交易”为核心，支持手动记录交易、上传截图、关联入场规则、生成 AI 复盘、确认复盘结果，并基于确认后的结构化数据做统计。

第一版不是 Web SaaS 产品，不做账号系统、云同步、网站部署、浏览器 URL 路由、SEO、券商/交易所同步，也不处理多设备冲突。它首先要成为一个稳定、顺手、可长期使用的本地个人工具。

核心闭环：

```text
手动录入一笔已平仓交易
  -> 上传交易截图和笔记
  -> 关联入场规则版本
  -> 生成 AI 复盘
  -> 用户确认或修正
  -> 进入统计分析
```

## 2. 产品决策

### 2.1 使用场景

第一版面向单用户、本机使用。

主要交易场景是股指期货，优先支持 E-mini 和 Micro E-mini 这类合约，例如 ES、MES、NQ、MNQ。数据模型保留 `asset_class` 字段，后续可以扩展到股票、ETF、加密货币和外汇。

### 2.2 MVP 必须支持

- 手动新增、编辑、删除、查看交易。
- 面向期货交易的字段和盈亏计算。
- UI 先提供简单的“单笔交易”表单。
- 一笔交易的边界定义为“一次完整交易计划”，而不是单个成交回报。
- 底层保留成交明细模型，后续支持分批入场、加仓、减仓、分批止盈。
- 每笔交易支持多张图片。
- 入场规则库和规则版本管理。
- 单笔交易 AI 复盘。
- 用户确认或修正 AI 复盘结果。
- 按时间、品种、入场规则、标签做统计。
- 完整本地备份和恢复。
- 支持可控的数据清理，用于卸载前清除数据或重置应用。

### 2.3 MVP 暂不支持

- 券商、交易所或 CSV 导入。
- 云同步。
- 用户账号。
- 移动端。
- 完整每日复盘流程。
- 未平仓交易记录、持仓管理和 open trade 复盘。
- 在线图片画线和标注。
- 复杂成交明细编辑器。
- 回测。
- 行情数据接入。
- 多用户权限。
- 订阅和支付。

### 2.4 交易边界和持仓状态

MVP 中，一笔 `trade` 表示一次完整交易计划：从同一个入场逻辑出发，包含对应的入场、出场、风控和复盘结果。单个成交回报不是一笔 `trade`，后续的分批入场、加仓、减仓和分批止盈应归入同一笔交易下的 `trade_execution` 明细。

第一版只支持已平仓交易。用户需要在交易结束后录入完整的入场、出场和风险信息，再生成 AI 复盘并进入统计。未平仓交易、持仓中笔记和 open trade 复盘暂不进入 MVP，后续可以在现有 `status` 字段和 `trade_execution` 模型基础上扩展。

## 3. 技术架构

第一版采用本地优先桌面应用架构：

```text
Electron 桌面应用
  React + TypeScript Renderer
  Preload 安全桥
  Electron Main Process
  简单 App State 控制页面切换
  本地 SQLite 数据库
  本地图片目录
  AI 复盘适配器
  备份和恢复工具
```

推荐技术栈：

- 桌面壳：Electron。
- UI：React + TypeScript。
- 构建工具：Vite。
- 样式：Tailwind CSS 或类似的轻量本地 UI 方案。
- 数据库：SQLite。
- 图片：存放在本地应用数据目录，数据库只保存路径和元数据。
- AI：远程多模态模型 API。
- 图表：ECharts。

Electron 进程边界：

- Renderer 只负责 UI、表单状态、图表和用户交互。
- Preload 使用 `contextBridge` 暴露有限 API，禁止 Renderer 直接访问 Node.js 能力。
- Main Process 负责 SQLite、文件系统、图片目录、备份恢复、系统安全存储和外部链接打开。
- 默认启用 `contextIsolation`，关闭 `nodeIntegration`。

第一版不引入专门的 Web 路由库或 Web 数据缓存框架。页面切换用简单状态即可：

```text
currentView = trades | tradeDetail | rules | stats | backup | settings
selectedTradeId = ...
```

为了避免 UI 和持久化逻辑纠缠，领域操作需要封装到服务层：

```text
TradeService
RuleService
ReviewService
AttachmentService
StatsService
BackupService
SettingsService
```

## 4. 数据模型

数据模型以 `trade` 为中心。UI 第一版把交易呈现为简单的一次入场/一次出场，但数据库底层要保留多成交明细能力。

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

### 4.1 instrument

记录交易品种配置。

字段：

- `id`
- `symbol`
- `name`
- `asset_class`: `futures`, `stock`, `crypto`, `forex`, `etf`
- `exchange`
- `currency`
- `tick_size`
- `tick_value`
- `point_value`
- `created_at`
- `updated_at`

初始期货预设：

```text
ES:  tick_size 0.25, tick_value 12.5, point_value 50
MES: tick_size 0.25, tick_value 1.25, point_value 5
NQ:  tick_size 0.25, tick_value 5,    point_value 20
MNQ: tick_size 0.25, tick_value 0.5,  point_value 2
```

### 4.2 trade

记录单笔交易主信息。

字段：

- `id`
- `instrument_id`
- `entry_rule_id`
- `entry_rule_version_id`
- `direction`: `long`, `short`
- `status`: `closed`。字段保留后续扩展 `open`，但 MVP 只创建和复盘已平仓交易。
- `opened_at`
- `closed_at`
- `entry_price_avg`
- `exit_price_avg`
- `quantity`
- `stop_loss_price`
- `take_profit_price`
- `fees_total`
- `gross_pnl`
- `net_pnl`
- `risk_amount`
- `r_multiple`
- `background_note`
- `entry_reason`
- `exit_reason`
- `emotion_note`
- `lesson_note`
- `ai_review_status`: `not_generated`, `draft`, `needs_review`, `confirmed`, `corrected`, `invalid`
- `created_at`
- `updated_at`

系统自动计算：

- 点数盈亏。
- 毛盈亏。
- 净盈亏。
- 计划风险。
- R 倍数。
- 手续费影响。

期货盈亏计算：

```text
long point_pnl  = exit_price_avg - entry_price_avg
short point_pnl = entry_price_avg - exit_price_avg
gross_pnl       = point_pnl * point_value * quantity
net_pnl         = gross_pnl - fees_total
r_multiple      = net_pnl / risk_amount, risk_amount > 0 时计算
```

### 4.3 trade_execution

记录底层成交明细。

字段：

- `id`
- `trade_id`
- `executed_at`
- `side`: `buy`, `sell`
- `price`
- `quantity`
- `fee`
- `fee_currency`
- `execution_type`: `entry`, `exit`, `add`, `reduce`
- `created_at`

MVP UI 可以根据简单表单自动生成 entry 和 exit 两条成交明细。后续版本再开放完整成交明细编辑器。

### 4.4 entry_rule

记录入场规则主信息。

字段：

- `id`
- `name`
- `description`
- `market_type`
- `status`: `active`, `archived`
- `created_at`
- `updated_at`

### 4.5 entry_rule_version

记录不可变的规则版本。历史交易必须绑定具体规则版本，避免未来修改规则后污染历史复盘。

字段：

- `id`
- `entry_rule_id`
- `version_no`
- `content`
- `checklist_json`
- `created_at`

### 4.6 trade_attachment

记录交易图片元数据，图片文件本身保存在本地应用数据目录。

字段：

- `id`
- `trade_id`
- `image_type`: `before_entry`, `entry`, `holding`, `exit`, `review_marked`
- `file_path`
- `caption`
- `sort_order`
- `created_at`

### 4.7 ai_review

记录 AI 复盘结果和用户确认后的最终结果。

字段：

- `id`
- `trade_id`
- `status`: `draft`, `confirmed`, `corrected`, `needs_review`, `invalid`
- `model`
- `prompt_version`
- `rule_version_snapshot`
- `score_total`
- `summary`
- `facts_json`
- `missing_info_json`
- `image_observations_json`
- `strengths_json`
- `weaknesses_json`
- `suggestions_json`
- `tags_json`
- `confidence`
- `raw_result_json`
- `created_at`
- `confirmed_at`

统计只使用 `confirmed` 或 `corrected` 状态的 AI 复盘结果。

### 4.8 trade_rule_check

记录 AI 或用户对规则 checklist 每一项的判断。

字段：

- `id`
- `trade_id`
- `entry_rule_version_id`
- `check_item`
- `result`: `pass`, `fail`, `unknown`
- `evidence`
- `comment`
- `score_delta`
- `created_at`

### 4.9 tag 和 trade_tag_map

标签用于灵活记录错误、情绪、交易场景和市场背景。

`tag` 字段：

- `id`
- `name`
- `category`: `mistake`, `emotion`, `setup`, `market`
- `created_at`

`trade_tag_map` 字段：

- `trade_id`
- `tag_id`

### 4.10 app_setting

记录本地应用配置。

字段：

- `key`
- `value`
- `updated_at`

配置项包括：

- OpenAI API Key 或安全存储引用。
- 默认交易品种。
- 默认货币。
- 数据目录。
- 备份目录。
- AI 模型。
- Prompt 版本。

API Key 优先使用系统安全存储。普通本地设置中只保存非敏感配置或安全存储引用。

AI 默认模型在实现阶段根据官方当前建议选择。模型选择应该是配置项，不应成为数据库结构依赖。

## 5. AI 复盘设计

AI 复盘只用于复盘交易，不用于预测行情，也不提供未来交易建议或喊单。

### 5.1 AI 输入

每次复盘可以包含：

- 交易字段。
- 品种配置。
- 入场规则内容。
- 入场规则 checklist。
- 交易背景。
- 入场理由。
- 出场理由。
- 情绪备注。
- 止损和止盈信息。
- 手续费和盈亏结果。
- 交易截图。

用户已经确认第一版可以把交易记录、文字笔记和截图发送给远程 AI API。

### 5.2 复盘流程

```text
组装交易复盘上下文
  -> 检查输入完整度
  -> 发送文字和图片给 AI
  -> 接收结构化复盘结果
  -> 校验输出 schema
  -> 保存为草稿复盘
  -> 用户确认或修正
  -> 最终结果进入统计
```

### 5.3 AI 输出结构

AI 输出必须是结构化结果：

```text
summary
facts
missing_info
image_observations
rule_checks
scores
strengths
weaknesses
suggestions
tags
confidence
needs_human_review
```

保存前必须校验结构。无效输出应拒绝保存或触发重试。

### 5.4 评分体系

第一版使用 100 分制：

```text
规则一致性：30
风险控制：25
计划执行：20
记录完整度：15
交易质量：10
```

每个评分项都应包含：

- 分数。
- 证据。
- 扣分原因。
- 是否需要人工确认。

### 5.5 防幻觉规则

Prompt 和输出校验需要约束 AI：

- 只能基于用户提供的交易数据、笔记、规则和图片判断。
- 不得编造市场背景。
- 不得在缺少证据时推断用户情绪。
- 不得给未来交易建议或喊单。
- 证据不足时输出 `unknown`。
- 重要结论必须绑定证据。
- 区分事实和建议。

## 6. UI 设计

应用应像一个专注的桌面工作台，而不是网站或营销页。

主导航：

```text
交易
规则
统计
备份
设置
```

### 6.1 交易列表

默认按时间倒序。

列信息：

- 时间。
- 品种。
- 方向。
- 合约数。
- 入场价。
- 出场价。
- 净盈亏。
- R 倍数。
- 入场规则。
- AI 分数。
- 复盘状态。
- 缩略图。

筛选：

- 时间范围。
- 品种。
- 方向。
- 入场规则。
- 盈利或亏损。
- 复盘状态。
- 标签。

操作：

- 新增交易。
- 打开交易详情。
- 复制交易。
- 删除交易。

### 6.2 交易详情和复盘页

这是 MVP 最核心页面。

推荐布局：

```text
左侧：交易事实
中间：笔记和图片时间线
右侧：AI 复盘结果
```

页面分区：

- 基础信息。
- 价格和风险。
- 规则和背景。
- 笔记。
- 图片。
- AI 复盘。

AI 复盘操作：

- 生成复盘。
- 重新生成。
- 确认结果。
- 编辑 AI 结果。
- 标记无效。

### 6.3 图片管理

支持图片类型：

- 入场前。
- 入场时。
- 持仓中。
- 出场后。
- 复盘标注图。

MVP 图片操作：

- 拖拽上传。
- 选择图片类型。
- 添加备注。
- 调整排序。
- 设置封面图。
- 大图预览。

MVP 不内置图片画线或标注编辑器。用户可以先上传外部工具标注好的截图。

### 6.4 规则库

每条规则支持：

- 规则名称。
- 适用市场或品种。
- 规则描述。
- 入场条件 checklist。
- 禁入条件 checklist。
- 止损原则。
- 止盈原则。
- 示例图片。
- 启用或归档状态。
- 版本历史。

编辑规则时创建新版本。已有交易继续绑定历史规则版本。

### 6.5 统计页

MVP 统计需要回答三个问题：

- 总体表现如何？
- 哪些规则表现最好或最差？
- 哪些错误最常重复出现？

总览指标：

- 总交易数。
- 胜率。
- 总净盈亏。
- 平均 R。
- 平均盈亏比。
- 平均 AI 分数。
- 总手续费。

统计维度：

- 按日、周、月。
- 按入场规则。
- 按品种。
- 按标签或错误。
- AI 分数和盈亏关系。

统计项应支持下钻回交易列表，例如点击某个规则后进入该规则下的交易集合。

### 6.6 备份和数据管理

备份是第一版必需功能，因为应用是本地优先。

备份功能：

- 导出完整备份。
- 导入完整备份。
- 打开数据目录。
- 清除所有本地数据。
- 重置应用。

备份包结构：

```text
backup.zip
  app.sqlite
  attachments/
  manifest.json
```

`manifest.json` 包含：

- 备份 schema 版本。
- 应用版本。
- 导出时间。
- 数据库文件名。
- 附件文件列表。
- 文件校验和。

“清除所有本地数据”必须强确认。应用应建议先导出备份，并要求二次确认，例如输入 `DELETE`。

卸载行为要区分“删除应用”和“删除交易数据”。操作系统卸载应用时可能保留本地数据，所以应用内必须提供可控的数据清理入口。

### 6.7 设置页

设置项：

- OpenAI API Key 或安全存储引用。
- 默认货币。
- 默认交易品种。
- 数据目录。
- 备份目录。
- AI 模型。
- Prompt 版本。
- 应用版本。

## 7. 迁移和备份策略

迁移分两类：

1. 应用升级时的数据库 migration。
2. 新版本应用导入旧备份包时的备份包 migration。

数据库 migration 必须有版本号，并按顺序执行。

备份导入流程：

- 校验 manifest。
- 检查必需文件是否存在。
- 检查备份 schema 版本。
- 必要时运行导入迁移。
- 明确提示用户导入会替换当前应用数据。
- 用户确认后再替换当前数据。
- 避免导入到一半导致半恢复状态。

MVP 只支持“完整替换式恢复”，不支持把备份和当前数据合并。

## 8. 后续扩展

### 8.1 每日复盘

每日复盘应建立在单笔交易复盘之上，而不是替代它。

后续可新增：

```text
daily_review
daily_review_trade_map
```

每日复盘可聚合：

- 当日交易列表。
- 总盈亏。
- 胜率。
- 平均 R。
- 平均 AI 分数。
- 主要错误。
- 最好和最差交易。
- 情绪模式。
- 次日改进计划。

### 8.2 云同步

云同步不属于 MVP。后续可以加入：

- 用户账号。
- PostgreSQL 或 Supabase 后端。
- 图片对象存储。
- 冲突处理。
- 设备同步状态。

### 8.3 高级成交明细编辑

底层数据模型已经支持多成交。后续 UI 可以开放：

- 分批入场。
- 加仓。
- 减仓。
- 分批止盈。
- 每笔成交独立手续费。

### 8.4 图片标注

MVP 接收已经标注好的截图。后续可增加：

- 画线工具。
- 箭头和文字。
- 价格水平线。
- 标注图层保存。

## 9. 里程碑

### M1：桌面骨架和本地数据

- 初始化 Electron、React、TypeScript、Vite。
- 基础应用壳。
- 简单页面状态。
- SQLite 连接。
- 数据库 migration。
- 初始品种预设。
- 设置页。

### M2：交易记录闭环

- 交易 CRUD。
- 期货盈亏计算。
- 自动生成简单 entry 和 exit 成交明细。
- 图片上传和预览。
- 交易列表和详情页。

### M3：规则库

- 规则 CRUD。
- checklist 编辑。
- 规则版本化。
- 交易绑定规则版本。

### M4：AI 复盘

- AI Adapter。
- 结构化输出 schema。
- 文字和图片复盘请求。
- 复盘结果展示。
- 用户确认和修正。
- AI 生成标签。

### M5：统计和备份

- 总览统计。
- 时间、规则、品种、标签统计。
- 从统计下钻到筛选后的交易列表。
- 导出备份。
- 导入备份。
- 清除本地数据。
- 初始打包验证。
