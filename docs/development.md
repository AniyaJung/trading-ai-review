# 开发指南

## 环境要求

- Windows 或 macOS。
- 支持当前 Vite、TypeScript 和 `node:sqlite` 的现代 Node.js 版本，推荐当前 Node.js LTS。
- pnpm。仓库包含 `pnpm-lock.yaml` 和 Electron 构建许可配置。

Electron 是开发依赖，安装后运行时位于 `node_modules/electron/dist`。不需要单独把 Electron 安装到系统目录，也不需要 Rust/Cargo。

## 安装与启动

```powershell
pnpm install
pnpm dev
```

`pnpm dev` 同时启动 Vite 渲染服务器、编译 Electron 主进程/preload，并在渲染服务器就绪后打开桌面窗口。

只查看浏览器渲染预览：

```powershell
pnpm web:dev
```

浏览器预览不支持 SQLite、文件选择、截图、AI Key、备份、恢复和本地重置，不应用来判断桌面工作流是否完整。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 启动 Electron 开发模式 |
| `pnpm web:dev` | 启动浏览器渲染预览 |
| `pnpm test -- --run` | 单次运行全部 Vitest 测试 |
| `pnpm lint` | 运行 ESLint |
| `pnpm build` | TypeScript 检查并构建渲染层、主进程和 preload |
| `pnpm pack:dir` | 构建并生成未签名本地目录包 |
| `pnpm smoke:packaged` | 对现有目录包执行自动启动 smoke |
| `pnpm preview` | 预览 Vite 构建产物，不含桌面能力 |

## 目录结构

```text
electron/
  data/          SQLite 和应用数据路径
  ipc/           IPC 注册和输入边界
  services/      主进程领域服务
shared/
  contracts/     跨进程 DTO 与 DesktopApi
  trading/       共享交易计算
src/
  app/           Renderer 工作流、状态和纯逻辑
  components/    React 功能界面
  styles/        功能样式
scripts/         目录打包和 packaged smoke
docs/            当前文档
docs/superpowers 历史规格、计划和记录
```

构建输出：

- `dist/`：Vite 渲染产物。
- `dist-electron/`：Electron 主进程和 preload。
- `release/`：本地目录打包产物。

## 修改约束

- 跨进程类型先修改 `shared/contracts/`，再同步 preload、IPC、服务和 renderer 调用。
- Renderer 不直接引入 Node/Electron 内置模块，不直接读取数据库或文件。
- SQLite schema 变化必须新增向前迁移、提高 `supportedDatabaseVersion` 并覆盖新建库和旧版本升级测试。
- AI 响应字段变化应同步 Prompt、JSON Schema、响应归一化、契约和 fixture 测试。
- 标签同步必须保留 `manual` 与 `ai_review` 的来源边界。
- 恢复、重置等破坏性操作继续复用统一生命周期，先验证并创建安全备份。
- 功能变化同时更新 [文档索引](README.md) 指向的当前文档，不把历史实施计划当作现行说明继续修改。

## 提交前验证

常规代码变更至少执行：

```powershell
pnpm test -- --run
pnpm lint
pnpm build
```

涉及 Electron 启动、SQLite 运行时、路径、备份或打包脚本时，再执行：

```powershell
pnpm pack:dir
pnpm smoke:packaged
```

如果自动 smoke 受当前机器 GPU/子进程环境影响失败，应记录完整原因，并通过可见窗口手动验证启动、数据库、截图、备份/恢复和 Key 重启解密；不能把“能构建”写成“打包运行已通过”。
