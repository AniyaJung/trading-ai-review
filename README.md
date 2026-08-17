# AI Trading Review

本地优先的桌面交易复盘应用。当前版本面向已平仓期货交易，把交易事实、入场规则、截图、标签、AI 草稿、人工确认和统计保存在同一套本地工作流中。

## 项目定位

- 一笔交易代表一个完整交易计划，不等同于单次成交回报。
- AI 只生成待审核草稿；只有人工确认或修正后的复盘才进入统计。
- SQLite、截图和备份默认保存在 Electron 的本机 `userData` 目录，不依赖云端数据库。
- 当前内置 ES、MES、NQ、MNQ 四个期货品种。

## 当前能力

- 新建、查看、编辑和删除已平仓交易，自动计算净盈亏与 R 倍数。
- 创建入场规则、追加不可变版本、归档规则，并把具体规则版本绑定到交易。
- 为交易添加截图、备注和策略/错误/情绪/市场标签。
- 通过兼容 OpenAI Responses API 的服务生成结构化 AI 复盘，支持自定义模型、Base URL 和网络代理。
- 确认、修正或作废 AI 草稿，保留规则检查、评分、用量和原始结果以便追溯。
- 按日期口径、品种、入场规则和标签筛选统计，并下钻回交易列表。
- 导出和恢复包含 SQLite、截图及校验清单的本地 ZIP 备份。
- 本地数据重置前自动创建安全备份。

## 快速开始

已有 Windows 打包目录时，直接运行目录中的 `AI Trading Review.exe`。整个目录是一个完整应用，不能只复制 exe 文件。

从源码启动需要 Node.js 和 pnpm：

```powershell
pnpm install
pnpm dev
```

常用检查：

```powershell
pnpm verify
```

在当前平台生成未签名的本地目录包：

```powershell
pnpm pack:dir
```

生成 Windows x64 便携目录和 ZIP（包括在其他平台交叉打包）：

```powershell
pnpm pack:win:x64
```

ZIP 输出到 `release/AI Trading Review-win32-x64-portable.zip`。便携包未签名，首次启动可能触发 Windows SmartScreen。

`pnpm web:dev` 只提供渲染层预览。本地数据库、文件选择、AI Key、备份和恢复等能力必须在 Electron 桌面应用中使用。

### Windows 便携包更新与卸载

更新前先导出备份并退出应用，再解压新 ZIP 或替换原应用目录。用户数据默认保存在 `%APPDATA%\AI Trading Review`，因此替换或删除便携应用目录不会删除交易、截图、备份和设置。

如需彻底删除本地数据，应先导出备份，再使用应用设置中的数据重置功能，或手动删除上述用户数据目录。

## 当前限制

- 不支持持仓中的交易、券商导入、云同步、多账户或移动端。
- 品种配置仍为本地预置，没有管理界面。
- 目录打包适合本机使用和验证，但还不是带安装器、代码签名或自动更新的正式发行版本。
- 第三方中转服务必须兼容应用使用的 OpenAI Responses API 与结构化输出参数。

## 文档

- [文档索引](docs/README.md)
- [使用指南](docs/user-guide.md)
- [AI 与第三方接口配置](docs/ai-configuration.md)
- [架构说明](docs/architecture.md)
- [开发指南](docs/development.md)
- [打包与部署](docs/packaging.md)
- [历史方案与交接记录](docs/superpowers/README.md)
