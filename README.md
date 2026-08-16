# dsh-tidychat

让 DSH 的长会话变成**可扫读、可跳转**的结论流。

多任务、多轮次的会话里，思考、工具调用、中间文字和最终总结混在一起，回头找「上次那个任务的结论」很费劲。dsh-tidychat 把已完成的任务轮次自动折叠成一条结论，把思考与正文用分隔线切开，并在聊天区左缘提供一条 Codex 式的定位条，让你随时跳回任意一次对话。

> 🔌 生态：挂 `#dsh` · `#dsh-plugin` topic，欢迎收录。

## ✨ 功能

| 功能 | 说明 |
| --- | --- |
| 🗂 自动折叠 | 已完成轮次自动收起思考（Think）、工具调用与中间文字，只保留最终总结；控制条含「过程 N 步」和处理时长（用时 / 首 token / 速率） |
| ➖ 分隔线 | 思考行与正文之间的实线，一眼区分「过程」与「结论」 |
| 📍 左缘定位条 | Codex 式细窄条状导航，每条对应用户消息；悬停弹出摘要卡（含日期时间）、附近条幅联动变长，点击平滑跳转 |
| ⬆ 自动加载历史 | 发现「加载更早」按钮时自动点击，把全部历史纳入折叠与导航 |

四个功能各自独立，可在「设置 → 插件配置」里可视化开关，改动即时生效。

<!-- 截图占位：折叠前后对比 -->
<!-- 截图占位：左缘定位条 -->
<!-- 截图占位：设置面板 -->

## 🚀 安装

前置：已安装 DSH（Web 版），`pnpm` 在 PATH 上。

```sh
# 从 GitHub 安装
dsh plugin --profile web add git+https://github.com/BananaSoldier01/dsh-tidychat.git
```

安装后重启 dsh web + 硬刷新（Cmd+Shift+R）。

### 本地开发（link 模式）

```sh
git clone https://github.com/BananaSoldier01/dsh-tidychat.git
cd dsh-tidychat
pnpm install
dsh plugin --profile web add link:$PWD
```

改源码后 `pnpm run build`，重启 dsh web / 硬刷新即生效。

## ⚙️ 设置

在「设置 → 插件配置」展开 **dsh-tidychat** 卡片：

- **自动折叠已完成轮次**：隐藏思考、工具调用与中间文字，只保留最终结论，控制条含处理时长。
- **思考↔文字分隔线**：在思考行与正文文字之间插入实线，区分过程与结论。
- **左缘定位条**：聊天区左缘的细窄条状导航，悬停显示摘要、点击跳转到对应消息。
- **自动加载更早历史**：发现「加载更早」按钮时自动点击，把全部历史纳入折叠与导航。

## 🔧 原理

纯浏览器半（`exports "./client"`）实现，host 半只注册 settings 命名空间，不修改任何 DSH 源码：

- 折叠 / 分隔 / 导航全部通过 DOM 结构锚点（`data-chat-anchor-key`、`data-variant="think"` 等契约级属性）定位，不依赖编译期 hash 类名；
- 通过 `MutationObserver` 观察会话 DOM，配合定时兜底扫描，处理流式渲染与历史加载带来的 DOM 变化；
- 展开 / 收起状态为会话内内存态，刷新后恢复默认（全部折叠）。

## 🧑‍💻 开发

```sh
pnpm install
pnpm run build      # tsdown 构建 lib/
pnpm run typecheck
```

## 📄 License

MIT
