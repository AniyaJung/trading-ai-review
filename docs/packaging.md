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
- SQLite 能初始化到数据库版本 6。
- 数据库、附件和备份目录路径正确。
- 能创建备份 ZIP。
- 能报告 `safeStorage` 可用性。

测试结束会删除临时数据，不使用真实用户数据库。

## 当前验证记录

2026-10-08：70 个测试文件、291 个测试通过，TypeScript、ESLint 和生产构建通过。重新生成了 Windows x64 本地目录包，自动 packaged smoke 通过：Renderer 成功挂载、数据库版本为 6、备份 ZIP 创建成功、`safeStorage` 可用。

2026-10-08：完成工作台界面整理并重新生成 Windows x64 目录包。浏览器预览覆盖交易、研究、统计、设置、标签、规则和备份七个页面；桌面最小窗口下无横向溢出，交易详情页签、键盘切换、研究记录保存和草稿保留均通过手工检查。新版目录包的 packaged smoke 通过，Renderer 成功挂载，标题为“AI 交易复盘”。

本次浏览器预览验证了研究记录保存、跨交易草稿保留、零值筛选、逐笔回看与筛选保留。CSV 内容和转义有单元测试覆盖；内置预览浏览器未返回下载事件，未完成桌面文件下载的交互验证。上述结果不代替真实数据环境中的第三方 AI 接口、文件选择器和 Key 重启解密检查。更早的 GPU 子进程失败保留在 [旧打包验证记录](superpowers/packaging-verification.md)。

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
