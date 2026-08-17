# AI 与第三方接口配置

## 应用调用方式

AI Trading Review 从 Electron 主进程发起请求，使用 OpenAI Responses API 风格的 `POST /responses` 接口、Bearer API Key、图片输入和严格 JSON Schema 结构化输出。

默认值：

| 项目 | 默认值 |
| --- | --- |
| 模型 | `gpt-5.5` |
| Base URL | `https://api.openai.com/v1` |
| Prompt 版本 | `single-trade-ai-v2` |
| 请求重试 | 最多 2 次；仅对超时、限流、服务端和部分网络错误重试 |

默认模型只是应用预设。实际可用模型取决于所连接的官方或第三方服务。

## 在应用内配置

打开“设置 > AI Key 与模型”：

1. 填写服务要求的 API Key。
2. 填写服务实际支持的模型名。
3. 填写 API Base URL，通常以 `/v1` 结束。
4. Prompt 版本一般保留当前默认值。
5. 只有网络访问确实需要转发时才填写代理。
6. 保存后回到交易详情生成 AI 草稿。

应用会去掉 Base URL 末尾多余的 `/`，再补上 `/responses`。如果填写的 URL 已经以 `/responses` 结束，则不会重复追加。

## CC Switch 或其他中转服务

应用不读取 CC Switch 的配置文件，也不会自动继承它为其他客户端切换的账号。要通过 CC Switch 或其他非官网接口使用，需要把当前线路的有效连接参数显式填入本应用：

- API Key：中转服务要求的 Key，不一定是 `sk-` 前缀。
- 模型：中转服务映射或公开的模型名。
- Base URL：中转服务提供的 OpenAI 兼容入口。
- 代理：仅当该线路还要求本机 HTTP/SOCKS 网络代理时填写。

中转服务至少需要兼容 Responses API、`input_text`、`input_image`、`text.format.json_schema`、`reasoning.effort` 和 `text.verbosity`。只兼容旧版 `/chat/completions` 的服务无法直接使用当前实现。

Base URL 和代理不是同一概念：Base URL 决定请求发给哪个 API 服务；代理只负责转发网络连接。若 CC Switch 提供的是本机 API 网关，应把网关地址填到 Base URL，而不是代理框。

## 环境变量

也可以在启动 Electron 前设置：

| 环境变量 | 作用 |
| --- | --- |
| `OPENAI_API_KEY` | API Key |
| `OPENAI_MODEL` | 模型名 |
| `OPENAI_BASE_URL` | API Base URL |
| `HTTPS_PROXY` / `https_proxy` | 优先使用的网络代理 |
| `HTTP_PROXY` / `http_proxy` | HTTPS 代理未设置时的后备代理 |

配置优先级为：应用内本地设置 > 环境变量 > 应用默认值。Prompt 版本没有环境变量后备项。

应用内代理支持 `http`、`https`、`socks4` 和 `socks5` URL，例如 `http://127.0.0.1:7890`。清空本地字段并保存后，应用才会回退到环境变量或默认值。

## Key 存储与数据发送

- API Key 保存在本地 SQLite 设置表中。
- Electron `safeStorage` 可用时，Key 会先由操作系统能力加密后再写入数据库。
- `safeStorage` 不可用时，当前实现会回退为本地明文存储。此时更适合使用环境变量，或先确认设备磁盘和账户访问安全。
- 设置页只显示是否已配置和来源，不回显已保存 Key。
- 生成复盘时，交易事实、规则、Checklist 和所选截图会发送给配置的 API 服务。
- 不要在日志、截图或文档中记录真实 Key。

## 常见错误

| 现象 | 优先检查 |
| --- | --- |
| 401 / 403 | Key 是否属于当前 Base URL，是否被中转服务拒绝 |
| 400 / 422 | 模型名、Responses API、结构化输出或图片参数是否兼容 |
| 404 | Base URL 路径是否正确，服务是否真的提供 `/responses` |
| 429 | 额度、并发或服务限流 |
| 连接超时/拒绝 | CC Switch 或本机网关是否运行，端口和代理是否正确 |
| 域名无法解析 | Base URL 拼写、DNS 或代理设置 |
| 返回内容无法解析 | 中转服务是否完整支持严格 JSON Schema 响应 |

排查第三方接口时，先用一笔不含截图的简单交易验证文本请求，再增加截图，以便区分基础协议和图片兼容问题。
