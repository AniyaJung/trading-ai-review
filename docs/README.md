# 文档索引

`docs/` 根目录只保存反映当前实现的文档。过去的设计、实施计划、交接记录和阶段性验证日志统一保留在 `docs/superpowers/`，用于追溯，不作为当前功能依据。

## 当前文档

| 文档 | 面向对象 | 内容 |
| --- | --- | --- |
| [项目 README](../README.md) | 所有人 | 项目定位、能力、快速开始和限制 |
| [使用指南](user-guide.md) | 使用者 | 交易、规则、标签、复盘、统计、备份与设置 |
| [AI 配置](ai-configuration.md) | 使用者/维护者 | API Key、模型、Base URL、代理和第三方接口兼容性 |
| [架构说明](architecture.md) | 开发者 | Electron 边界、模块职责、数据流和 SQLite |
| [开发指南](development.md) | 开发者 | 环境、命令、目录结构、测试和变更约束 |
| [打包与部署](packaging.md) | 开发者/发布者 | 本地目录包、桌面部署、验证状态和发行限制 |

## 历史资料

[历史资料索引](superpowers/README.md) 收录早期设计规格、实施计划、架构待办、会话交接和打包验证日志。历史文件中的分支名、测试数量、优先级和“下一步”可能已经过期。

## 维护规则

- 功能或交互变化时，优先更新 `user-guide.md` 和根 `README.md`。
- IPC、数据库版本、进程边界或模块职责变化时，更新 `architecture.md`。
- 环境变量、默认模型、接口协议或密钥策略变化时，更新 `ai-configuration.md`。
- 构建命令、产物结构或验证结论变化时，更新 `development.md` 与 `packaging.md`。
- 已完成的阶段方案保留原文，并移入或记录到 `superpowers/`，不要继续把它维护成当前说明。

当文档与代码不一致时，以 `package.json`、`shared/contracts/`、Electron 主进程实现和数据库迁移代码为准，再修正文档。
