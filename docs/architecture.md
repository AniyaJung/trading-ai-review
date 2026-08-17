# 架构说明

## 总览

应用采用 Electron + React + TypeScript。Electron 主进程拥有数据库、文件系统、备份、密钥和外部网络请求；渲染进程只通过 preload 暴露的窄接口访问这些能力。

```text
React renderer
  -> window.desktopApi
  -> Electron preload
  -> typed IPC handlers
  -> domain services
  -> SQLite / filesystem / AI API
```

`shared/contracts/` 是进程间 DTO 和 `DesktopApi` 的公共契约，避免渲染进程、preload 和主进程各自定义不同类型。

## 进程边界

### Renderer: `src/`

- `src/App.tsx`：应用启动后的工作流装配、导航输入和跨工作流刷新协调。
- `src/components/`：交易、规则、标签、统计、备份和设置界面。
- `src/app/`：可测试的状态、格式化、筛选和 React 工作流 hooks。
- 渲染进程不直接访问 Node.js、SQLite、文件路径或 API Key。

浏览器预览没有 `window.desktopApi`，只用于查看渲染层和预览数据，不是完整产品运行时。

### Preload: `electron/preload.ts`

preload 使用 `contextBridge` 暴露按领域分组的 `DesktopApi`，把渲染调用转换为 IPC。窗口启用 `contextIsolation` 并关闭 `nodeIntegration`。

### Main: `electron/`

- `main.ts`：应用生命周期、窗口、数据库初始化和 IPC 注册。
- `ipc/`：参数边界和 Electron 通道注册。
- `services/`：交易、规则、标签、复盘、统计、附件、备份和设置用例。
- `data/`：应用数据路径、SQLite schema、迁移和预置数据。
- `windowOptions.ts`：主窗口安全和显示选项。

网络 AI 调用在主进程完成，Key 不会通过 Desktop API 返回给渲染进程。

## 主要数据流

### 保存交易

1. 表单在渲染层完成中文校验和本地时间转换。
2. IPC 把标准化输入交给交易服务。
3. 服务读取品种配置，计算毛盈亏、净盈亏、手续费和 R 倍数。
4. SQLite 事务保存交易及入场/出场 execution 记录。
5. 渲染层刷新列表和当前详情。

### 生成 AI 复盘

1. 主进程读取交易详情、绑定的规则版本和截图。
2. Prompt builder 和 JSON Schema 组成 Responses API 请求。
3. 图片作为 data URL 以低细节模式加入请求。
4. 响应经过解析、结构归一化和评分处理后保存为草稿。
5. 人工确认或修正时，同步 AI 来源标签并更新交易复盘状态。

### 标签

`tag` 保存标签定义，`trade_tag_map` 保存交易关联和 `source`：

- `manual`：用户在交易详情中添加。
- `ai_review`：确认或修正 AI 结果时同步。

AI 同步只重写 AI 来源关联，不会批量删除手动来源标签。当前删除标签定义会通过外键级联移除所有来源的交易关联。

### 备份与恢复

备份服务收集 SQLite 和附件，生成带 SHA-256 校验信息的 ZIP。恢复先验证格式、版本、路径和校验值，再创建安全备份、关闭数据库、替换文件并按流程重启或刷新应用。

## SQLite

当前数据库版本为 `4`，由 `pragma user_version` 管理。新数据库直接创建当前 schema；旧数据库按顺序迁移。

核心数据包括：

- 品种配置和交易事实。
- 入场规则及不可变规则版本。
- execution 和附件元数据。
- AI 复盘、规则检查、确认状态和评分。
- 标签定义与带来源的交易标签映射。
- 应用设置。

当前预置品种为 ES、MES、NQ、MNQ。SQLite 使用 Electron/Node 内置的 `node:sqlite`，不依赖原生第三方 SQLite 模块。

## 本地路径

路径都位于 Electron `app.getPath("userData")` 返回的目录下：

```text
userData/
  app.sqlite
  attachments/
  backups/
```

具体绝对路径因系统和安装方式而异，运行应用后可在“设置 > 本地路径”查看并直接打开。

## 安全边界

- Renderer 开启上下文隔离，不能直接使用 Node API。
- 主窗口拒绝应用内新窗口，并把外部链接交给系统浏览器。
- 附件预览通过受控 ID 读取，不接受渲染层任意文件路径。
- 备份历史恢复只允许应用管理的备份目录内文件；手动选择恢复仍要经过格式、路径和校验检查。
- API Key 优先使用 Electron `safeStorage`；不可用时存在明文回退，详见 [AI 配置](ai-configuration.md)。

## 测试边界

- `shared/` 和 `src/app/`：纯计算、格式化和状态转换。
- `src/components/`：关键渲染与交互状态。
- `electron/services/`：SQLite、文件、AI 适配和业务规则。
- `electron/ipc/` 与 `preload`：跨进程契约和窄处理器。
- 打包 smoke：独立临时 `userData` 下的启动、迁移、渲染挂载和备份路径。

桌面应用是支持的产品表面；浏览器预览不承担数据库和原生能力的端到端验证。
