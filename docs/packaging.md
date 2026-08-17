# 打包与部署

## 当前打包方式

项目当前提供未签名的本地目录包，用于本机运行和验证：

```powershell
pnpm pack:dir
```

命令会先执行生产构建，再复制 Electron runtime、`dist/`、`dist-electron/`、`package.json` 和生产依赖。

Windows x64 默认产物：

```text
release/AI Trading Review-win32-x64/
  AI Trading Review.exe
  resources/
  ... Electron runtime files
```

macOS 会生成对应架构目录和 `AI Trading Review.app`。Linux 暂不受脚本支持。

## 部署到桌面

Windows 上应复制整个 `AI Trading Review-win32-x64` 目录，并可把目标目录改名为 `AI Trading Review`。例如：

```text
Desktop/AI Trading Review/AI Trading Review.exe
```

不要只复制 `AI Trading Review.exe`；它依赖同目录的 Electron runtime、`resources/app` 和其他文件。更新桌面副本前先退出正在运行的应用，再用新的完整目录替换应用文件。用户数据不在应用目录中，因此替换应用目录不会主动删除 SQLite、截图或备份。

当前这台 Windows 机器的桌面副本位于：

```text
C:\Users\Ahri\Desktop\AI Trading Review\AI Trading Review.exe
```

## 自动 smoke

先生成目录包，再运行：

```powershell
pnpm smoke:packaged
```

脚本使用独立临时 `userData`，验证：

- 打包程序能够启动并退出。
- Renderer 已挂载并包含可见文本。
- SQLite 能初始化到数据库版本 4。
- 数据库、附件和备份目录路径正确。
- 能创建备份 ZIP。
- 能报告 `safeStorage` 可用性。

测试结束会删除临时数据，不使用真实用户数据库。

## 当前验证记录

截至 2026-08-08，最近一次源码级验证记录为：63 个测试文件、256 个测试通过，TypeScript、ESLint 和生产构建通过。交互式打包程序可以启动。

当前机器上，隐藏窗口且禁用 GPU 的自动 packaged smoke 曾因 Electron GPU 子进程错误失败，因此不能把自动 smoke 标记为已通过。重新得到成功输出前，应把它视为待验证项。历史过程见 [旧打包验证记录](superpowers/packaging-verification.md)。

## 手工检查清单

每次准备给实际使用者替换应用时，至少检查：

- 启动后不是空白页，交易列表和新建交易视图可切换。
- 新建、编辑、删除一笔测试交易正常。
- 系统文件选择器可添加截图，缩略图和大图预览正常。
- AI Key 保存后重启仍可使用；第三方 Base URL 和代理按预期生效。
- AI 草稿可以生成、确认/修正/作废，标签来源正确。
- 完整备份可导出，恢复前安全备份可生成，恢复后应用数据正确。
- 设置中的数据目录与备份目录按钮可打开正确位置。

## 发行限制

当前目录包不是正式安装包，尚未包含：

- Windows 安装器、代码签名和卸载流程。
- macOS 签名、公证和 DMG/ZIP 发布流程。
- 自动更新、版本发布和回滚通道。
- CI 上的多平台打包验证。

正式发布前需要选择稳定的 Electron 打包工具和证书策略，并重新验证 `node:sqlite`、系统文件选择器、`safeStorage`、备份恢复以及第三方 API 配置在安装包环境中的行为。
