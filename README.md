# dsh-tidychat

让 DSH 的长会话变成**可扫读、可跳转**的结论流。

多任务、多轮次的会话里，思考、工具调用、中间文字和最终总结混在一起，回头找「上次那个任务的结论」很费劲。dsh-tidychat 把已完成的任务轮次自动折叠成一条结论，把思考与正文用分隔线切开，并在聊天区左缘提供一条 Codex 式全局导航定位条（Canvas minimap），任意长度的会话都能全局浏览、快速跳转。

> 🔌 生态：挂 `#dsh` · `#dsh-plugin` topic，欢迎收录。

## ✨ 功能

| 功能 | 说明 |
| --- | --- |
| 🗂 自动折叠 | 已完成轮次自动收起思考（Think）、工具调用与中间文字，只保留最终总结；控制条含「过程 N 步」和处理时长（用时 / 首 token / 速率） |
| ➖ 分隔线 | 思考行与正文之间的实线，一眼区分「过程」与「结论」 |
| 📍 左缘定位条（Adaptive Navigation Rail） | 固定高度 Canvas minimap：任意轮次（几十到几千）全局映射到同一可视区；鱼眼悬停放大、拖动预览、点击跳转到阅读区顶部；当前轮次高亮跟随滚动；默认色可背景自适应或手动选「色系 × 明度」，强调色（当前/悬停回合）独立配色 |
| ⬆ 智能加载更早历史 | 页面空闲时逐步加载更早记录；检测到页面响应开始下降时自动暂停，保持长会话流畅，需要时仍可手动继续加载 |
| 📤 一键报告问题 | 自动生成诊断报告（版本/浏览器/性能数据/异常检测/现象标签），一键打开 GitHub issue 预填页，标题正文全带，零手写提交 |

四个功能各自独立，可在「设置 → 插件配置」里可视化开关，改动即时生效；另有「📤 生成诊断报告并提交」一键入口。

## 📸 效果

**自动折叠**：已完成轮次收成一条控制条，只留最终结论（上）；点击「展开」恢复思考、工具调用与中间文字（下）。

<p align="center">
  <img src="./assets/fold-collapsed.png" width="92%" alt="折叠：只留最终结论">
  <img src="./assets/fold-expanded.png" width="92%" alt="展开：恢复完整过程">
</p>

**左缘定位条（Canvas minimap）**：固定高度全局映射，任意长度会话可全局浏览；悬停鱼眼展开 + 摘要卡（含日期时间），拖动预览，点击跳转到阅读区顶部。

<p align="center">
  <img src="./assets/navigator.png" width="92%" alt="左缘定位条与悬停摘要">
</p>

**设置面板**：四个功能独立开关 + 现象标签 + 一键「生成诊断报告并提交」，改动即时生效。

<p align="center">
  <img src="./assets/settings.png" width="92%" alt="设置面板四开关">
</p>

## 🚀 安装

前置：已安装 DSH（Web 版），`pnpm` 在 PATH 上。

```sh
# 从 GitHub 安装（推荐钉版本，可复现）
dsh plugin --profile web add git+https://github.com/BananaSoldier01/dsh-tidychat.git#v0.1.3
```

安装后重启 dsh web + 硬刷新（Cmd+Shift+R）。

### 更新

插件以 profile 依赖的形式安装，更新就是让 pnpm 重新拉取该依赖的新版本（只拉这个插件，不会重下整个 DSH）：

```sh
# 方式 A：装的是 main 分支（不带 #tag），直接更新到最新
dsh plugin --profile web update @bananasoldier01/dsh-tidychat

# 方式 B：装的是某个 tag，改钉到新 tag 重新 add
dsh plugin --profile web add git+https://github.com/BananaSoldier01/dsh-tidychat.git#v0.1.3
```

更新后同样重启 dsh web + 硬刷新。

> ⚠️ **让设置开关可写（仅 DSH ≤ 0.1.0-rc.6 需要）**：rc.6 及更早版本的「设置 > 插件配置」白名单硬编码在宿主编译产物里，默认不含第三方插件的命名空间，导致开关变灰不可点。运行下面命令把 `tidychat` 加进白名单（幂等；DSH 升级后重跑即可）：
>
> ```sh
> curl -sL https://raw.githubusercontent.com/BananaSoldier01/dsh-tidychat/main/scripts/whitelist-patch.sh | bash
> ```
>
> **DSH ≥ 0.1.0-rc.7 不需要这条**：rc.7 起白名单机制移除，命名空间由插件动态注册，开关自动可点。

> 💡 **版本兼容性**：`0.2.0` 适配 **DSH ≥ 0.1.0-rc.7**（含 0.1.1-rc.x，已实测 rc.1/rc.2 契约点无变化）。rc.7 把 `settings.plugin.item` 槽从 list 改为 keyed，注册字段由 `id` 改为 `key`，旧版写法会报 "Failed to load plugins"；**DSH ≤ 0.1.0-rc.6 请使用 `0.1.0`**。

## 🗺️ 路线图

### 0.2.0（已实现，本次）—— Adaptive Conversation Navigation Rail

左缘定位条从「固定列表」升级为 **Canvas Minimap 全局导航**：

1. **固定高度**：`min(70vh, 660px)`，任意 turn 数量（20/70/200+）都映射在同一可视区内
2. **Turn 全局均匀映射**：`y = index/(total-1) × railHeight`，不随 turn 数增长 DOM（仅 1 个 canvas + 1 个提示卡）
3. **鱼眼 hover**：hover 附近 ±4 turn 间距放大、远处自动压缩，命中测试与绘制共用同一布局函数
4. **Drag scrubbing**：拖动时仅预览目标 turn，松手才跳转
5. **当前 turn 高亮**：以「阅读区顶部」为准（含 header 偏移），随滚动实时更新
6. **精确跳转**：用户消息滚到阅读区顶部（而非 viewport 中心或埋进 header）
7. **兼容性**：fold / divider / autoload / diagnostics 均不受影响（rail 数据来自会话快照，与折叠的 CSS 隐藏无关）

### 下一版本（候选）

1. **Turn Index 层** —— conversation DOM → Turn Index（id/element/position/summary），fold/navigator/autoload 共享索引，替代每次全量扫描；基于索引的增量维护（等真实 500+/1000+ 行数据再定方案）。
2. **运行中回合的已完成步骤折叠**（issue #2）—— 单轮内 LLM 执行大量动作时，运行中实时折叠已完成步骤。需求强度待验证。

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
- **智能加载更早历史**：页面空闲时逐步加载更早记录；检测到页面响应下降时自动暂停，保持长会话流畅，需要时仍可手动继续。
- **配色（高级，卡片内可折叠）**：两组均按「色系 × 多级明度」正交配置。**默认色**默认「自动」——优先用宿主淡色文字色，与聊天区背景对比不足时自动切纠偏灰（深背景淡灰、浅背景深灰），也可手动选色系（灰/黑/白/蓝/紫/青/绿/橙/红）与明度（l1 极浅 → l5 极深）；**强调色**控制「当前轮次 + 悬停/导航目标回合」的高亮色，默认「自动」= 跟随主题品牌色（`--dsw-alias-state-business-primary`）。

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
