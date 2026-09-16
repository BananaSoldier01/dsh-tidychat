# dsh-tidychat

> 🌐 [English](./README.en.md)

> **▼ DSH 版本适配**
> | DSH 版本 | settings 注册 | 折叠/分隔线/自动加载 | 消息轨（定位条） |
> | --- | --- | --- | --- |
> | 0.1.0-rc.7 / 0.1.1-rc.x | `register`（v0.2.7+）/ `installSettingsSection`（v0.2.5） | ✅ 折叠/分隔线/自动加载正常（v0.2.8 起回退 anchor-key；v0.2.7 不生效） | ✅ 可用（navigator 开；旧槽 + 锚点均在；旧版无官方轨，无需接管开关） |
> | 0.1.2-alpha.2+ / 0.1.2-rc.1 | `installSection` | ✅ 正常 | ✅ 可用（未发布修复起 —— 0.2.10 及更早在 0.1.2+ 上取数路径读错快照，轨道解析出 0 轮、实际不渲染；修复后无需额外操作，「接管官方消息轨」开关单独控制是否隐藏官方轨） |
>
> - **settings 自动适配**：插件按宿主 DSH 版本自动选用注册 API——0.1.2+ 用 `installSection`，0.1.0-rc.7 / 0.1.1-rc.x 用 `register`——同一份插件在 **0.1.0-rc.7 ~ 0.1.2-rc.1** 都能加载并设置开关。
> - **消息轨（定位条）**：DSH 0.1.2 起官方原生新增右缘 TurnNavigator，与本插件定位条功能重叠。**v0.2.10 起提供「接管官方消息轨」开关**：打开即隐藏官方右缘轨，由本插件定位条接管——可贴左缘或右缘镜像，样式可选「横线 / 圆点」，另有独立的「外圈」开关。**该开关默认关闭**，不替用户改动官方行为。
>   - ⚠️ 官方轨是**隐藏而非卸载**：宿主未提供原生开关，插件侧无法让官方组件「逻辑关闭」。开启接管后官方组件仍会挂载（DOM 保留），停掉的是绘制、布局、交互与滚动跟随。
> - **折叠/分隔线**：v0.2.8 起在旧版 DSH 也可用——`data-chat-turn` 缺失时回退到从 `data-chat-anchor-key` 解析 turn 号（v0.2.5 的做法）。v0.2.7 无此回退，故 v0.2.7 在旧版折叠/分隔线不生效（仅自动加载正常）。
> - **功能重叠**：DSH 0.1.2 起官方原生新增「折叠过程内容 + System prompt」与右缘 TurnNavigator，与插件的 fold / 消息轨重叠。
> - **使用建议**：
>   - **DSH 0.1.2+**：官方原生折叠与插件 fold 二选一——用官方就关插件 fold（避免双折叠）；想用插件的折叠控制条就关官方原生折叠。想用自己的消息轨就打开「接管官方消息轨」，否则会看到左右两条轨。
>   - **DSH ≤ 0.1.1-rc.x**：消息轨可用（navigator 开）；折叠/分隔线/自动加载在 v0.2.8 起也可用。

让 DSH 的长会话变成**可扫读、可跳转**的结论流。

多任务、多轮次的会话里，思考、工具调用、中间文字和最终总结混在一起，回头找「上次那个任务的结论」很费劲。dsh-tidychat 把已完成的任务轮次自动折叠成一条结论，把思考与正文用分隔线切开；聊天区边缘的 Codex 式全局导航消息轨（Canvas minimap）可贴左缘或右缘，配合「接管官方消息轨」开关即可在 **DSH 0.1.2+** 上替代官方右缘 TurnNavigator（旧版 DSH 无官方轨，直接可用）。

> 🔌 生态：挂 `#dsh` · `#dsh-plugin` topic，欢迎收录。

## ✨ 功能

| 功能 | 说明 |
| --- | --- |
| 🗂 自动折叠 | 已完成轮次自动收起思考（Think）、工具调用与中间文字，只保留最终总结；控制条含「过程 N 步」和处理时长（用时 / 首 token / 速率） |
| ➖ 分隔线 | 思考行与正文之间的实线，一眼区分「过程」与「结论」 |
| 📍 消息轨（Adaptive Navigation Rail） | 聊天区边缘的全局导航，可贴**左缘或右缘**（右缘整体镜像：强调三角指左、摘要卡从左侧弹出）。固定高度 Canvas minimap，任意轮次全局映射；鱼眼悬停、拖动预览、点击跳转、当前轮次高亮。两种显示样式：**横线** / **圆点**；另有独立**外圈**开关（当前轮与悬停轮外描一圈强调色）。配色可自适应，或用调色盘自定义（HEX/RGB 输入 + 透明度）。**DSH 0.1.2+ 需打开「接管官方消息轨」开关**才会接管（否则会与官方右缘轨并存） |
| 🎛 接管官方消息轨 | 隐藏 DSH 0.1.2+ 原生右缘 TurnNavigator，由本插件消息轨接管。**默认关闭**。注意：是隐藏而非卸载——官方组件仍会挂载（宿主未提供原生开关） |
| ⬆ 智能加载更早历史 | 页面空闲时逐步加载更早记录；检测到页面响应开始下降时自动暂停，保持长会话流畅，需要时仍可手动继续加载 |
| 📤 一键报告问题 | 自动生成诊断报告（版本/浏览器/性能数据/异常检测/现象标签），一键打开 GitHub issue 预填页，标题正文全带，零手写提交 |

折叠 / 分隔线 / 智能加载更早历史 / 接管官方消息轨可各自独立开关（「设置 → 插件配置」，改动即时生效）；消息轨本身另有「显示位置（左缘 / 右缘）」「显示样式（横线 / 圆点）」「外圈（关 / 开）」三项。另有一键「📤 生成诊断报告并提交」入口。

## 📸 效果

**自动折叠**：已完成轮次收成一条控制条，只留最终结论（上）；点击「展开」恢复思考、工具调用与中间文字（下）。

<p align="center">
  <img src="./assets/fold-collapsed.png" width="92%" alt="折叠：只留最终结论">
  <img src="./assets/fold-expanded.png" width="92%" alt="展开：恢复完整过程">
</p>

**消息轨（Canvas minimap）**：可贴左缘或右缘，样式可选横线 / 圆点，外圈可独立开关。下图为在无官方右缘 TurnNavigator 的旧版 DSH 上的运行效果（v0.2.10 起在 DSH 0.1.2+ 打开「接管官方消息轨」开关后同样可用）。

<p align="center">
  <img src="./assets/navigator.png" width="92%" alt="消息轨与悬停摘要">
</p>

**设置面板**：四个功能独立开关（含「接管官方消息轨」）+ 消息轨位置/样式/外圈 + 现象标签 + 一键「生成诊断报告并提交」，改动即时生效。

<p align="center">
  <img src="./assets/settings.png" width="92%" alt="设置面板">
</p>

## 🚀 安装

前置：已安装 DSH（Web 版），`pnpm` 在 PATH 上。

```sh
# 方式 1（推荐）：npm 包，预构建产物免 allowBuilds 授权
dsh plugin --profile web add @bananasoldier01/dsh-tidychat

# 方式 2：从 GitHub 安装（推荐钉版本，可复现）
dsh plugin --profile web add git+https://github.com/BananaSoldier01/dsh-tidychat.git#v0.2.10
```

安装后重启 dsh web + 硬刷新（Cmd+Shift+R）。

### 更新

插件以 profile 依赖的形式安装，更新就是让 pnpm 重新拉取该依赖的新版本（只拉这个插件，不会重下整个 DSH）：

```sh
# 方式 A：npm 方式安装，直接更新
dsh plugin --profile web update @bananasoldier01/dsh-tidychat

# 方式 B：装的是某个 tag，改钉到新 tag 重新 add
dsh plugin --profile web add git+https://github.com/BananaSoldier01/dsh-tidychat.git#v0.2.10
```

更新后同样重启 dsh web + 硬刷新。

> ⚠️ **让设置开关可写（仅 DSH ≤ 0.1.0-rc.6 需要）**：rc.6 及更早版本的「设置 > 插件配置」白名单硬编码在宿主编译产物里，默认不含第三方插件的命名空间，导致开关变灰不可点。运行下面命令把 `tidychat` 加进白名单（幂等；DSH 升级后重跑即可）：
>
> ```sh
> curl -sL https://raw.githubusercontent.com/BananaSoldier01/dsh-tidychat/main/scripts/whitelist-patch.sh | bash
> ```
>
> **DSH ≥ 0.1.0-rc.7 不需要这条**：rc.7 起白名单机制移除，命名空间由插件动态注册，开关自动可点。

> 💡 **版本兼容性**：`0.2.0` 起适配 **DSH ≥ 0.1.0-rc.7**（含 0.1.1-rc.x，已实测 rc.1/rc.2 契约点无变化）。rc.7 把 `settings.plugin.item` 槽从 list 改为 keyed，注册字段由 `id` 改为 `key`，旧版写法会报 "Failed to load plugins"；**DSH ≤ 0.1.0-rc.6 请使用 `0.1.0`**。

## 🗺️ 路线图

### 0.2.0（已发布）—— Adaptive Conversation Navigation Rail

左缘定位条从「固定列表」升级为 **Canvas Minimap 全局导航**：

1. **固定高度**：`min(70vh, 660px)`，任意 turn 数量（20/70/200+）都映射在同一可视区内
2. **Turn 全局均匀映射**：`y = index/(total-1) × railHeight`，不随 turn 数增长 DOM（仅 1 个 canvas + 1 个提示卡）
3. **鱼眼 hover**：hover 附近 ±4 turn 间距放大、远处自动压缩，命中测试与绘制共用同一布局函数
4. **Drag scrubbing**：拖动时仅预览目标 turn，松手才跳转
5. **当前 turn 高亮**：以「阅读区顶部」为准（含 header 偏移），随滚动实时更新
6. **精确跳转**：用户消息滚到阅读区顶部（而非 viewport 中心或埋进 header）
7. **兼容性**：fold / divider / autoload / diagnostics 均不受影响（rail 数据来自会话快照，与折叠的 CSS 隐藏无关）

### 0.2.1（已发布）—— 定位条配色完善（PR #5 合入）

1. **背景真实冒泡**：默认色 auto 的背景判定从会话滚动容器沿父级向上冒泡找第一个非透明背景（alpha=0 跳过），不再只查固定候选
2. **auto 尊重主题**：默认色 auto 优先用宿主淡色文字色，与实际背景 WCAG 对比 ≥3:1 才使用，不足自动切纠偏灰；强调色 auto（默认）= 跟随主题品牌色（`--dsw-alias-state-business-primary`）
3. **配色折叠为高级项**：设置卡片内「配色（高级）」可折叠收起，明度档在 auto 时禁用
4. **配置枚举化**：host schema 四个配色字段改为 `z.union` 枚举收敛取值；插件卸载时清除写入 `:root` 的临时 CSS 变量

### 0.2.2（已发布）—— 提示卡可读性（issue #6）

1. **头部提级**：提示卡 `#序号 · 时间` 由最弱一级（`label-tertiary`）提升到 `label-secondary`，亮色主题下不再发虚；正文跟随 `label-primary`（与对话正文同色），明暗随主题自动切换
2. **保守对比度兜底**：仅当提示卡浮层背景「不透明」（`bg-layer-3` alpha ≥ 0.85）且 label token 与背景对比 <3:1 时才写纠偏色（亮底深字 / 暗底亮字）；玻璃/半透明浮层（官方深色等）一律跳过、跟随主题 token——避免误判深色玻璃
3. **长摘要折行**：`overflow-wrap: anywhere`，含长代码/URL 的摘要在卡片内折行不溢出
4. **解析增强**：颜色解析支持 `rgba` 逗号/空格+斜杠语法、`#rgb/#rgba/#rrggbb/#rrggbbaa`、`transparent`

### 0.2.3（已发布）—— npm 发布准备（awesome-dsh-plugin 投稿推荐项）

1. **peerDependencies 化**：`@deepseek-ai/dsh-settings` 由 `dependencies` 移入 `peerDependencies`（官方运行时包由宿主 profile 提供，避免重复运行时）
2. **npm 发布**：`prepublishOnly` 自动构建，`@bananasoldier01/dsh-tidychat@0.2.3` 已公开发布（预构建产物，安装免 `allowBuilds` 授权）；推荐安装方式改为 `dsh plugin add @bananasoldier01/dsh-tidychat`
3. **投稿**：awesome-dsh-plugin 收录 PR 已提交（#3067，session 分类 + 截图条目），待维护者合并

### 0.2.4（已发布）—— npm 包元数据刷新

功能零改动，仅 npm 包内容更新：`README.en.md` 纳入包内、`repository.url` 规范化（`npm pkg fix`）、双语 README 随包发布。awesome-dsh-plugin 收录 PR #3067 已合并（session 分类 + 截图条目）。

### 0.2.5（已发布）—— Hardening（工程收口）

1. **折叠状态会话隔离（P0）**：`foldState` 改为 `Map<sessionId, Map<turn, boolean>>`，修复跨会话同轮次串扰（会话 A 展开第 5 轮 → 会话 B 第 5 轮不再错误继承展开态）
2. **定位条 pointermove 节流**：高频移动只记录最新坐标，rAF 帧内统一处理一次（不再每事件一次 React 渲染）；离开/卸载时清理挂起帧
3. **测量前不渲染**：宿主布局未就绪（`pos === null`）时不再渲染到写死的 280px 猜测位，测量成功后再出现
4. **快照/DOM 轮次一致性诊断**：报告新增「会话快照轮次 vs DOM 轮次」对照，不一致时报 ⚠️（加载中或 DOM 更新滞后）
5. 文档钉版示例随版本更新；package description 补齐「智能加载更早历史」

### 0.2.6（已发布）—— 折叠 & 分隔线重做；左缘定位条暂缓

1. **折叠重做（Codex 式）**：只折叠思考（Think）+ 工具调用，保留用户消息和最终正式回复；控制条为「用时 X + 箭头 + 分隔线」，整条可点击，折叠时箭头朝右、展开时朝下；过程与正式回复之间再画一条分隔线。
2. **分隔线重做**：过程/回复分界改用行内分隔线（思考芯片 `::after` 绘制，React 重渲染不清除），并加深到 `rgba(96,96,96,0.85)`（对比度更清晰）。
3. **⚠️ 左缘定位条暂缓显示**：DSH 0.1.2-rc.1 起官方原生新增右侧 TurnNavigator 与原生折叠，与插件左缘定位条功能重叠；同时插件定位条依赖 `react-dom`（当前插件 / 宿主均未提供）。因此从本版起**左缘定位条不再显示**。是否保留、或改造成与官方新的导航/折叠协同，待后续版本再定（源码与历史截图保留）。
4. **折叠含重试提示（issue #8）**：DSH 把被重试的模型请求渲染为 `model-retry` 行（“已重试模型请求”），此前折叠不会收起它。本版起 `model-retry` 作为过程噪音随思考/工具调用一起折叠。

### 0.2.7（已发布）—— settings API 向后兼容

1. **settings 注册自动适配**：宿主注册配置时按 DSH 版本自动选用 API——0.1.2+ 用 `installSection`，0.1.0-rc.7 / 0.1.1-rc.x 用 `register`——让同一份插件在 **DSH 0.1.0-rc.7 ~ 0.1.2-rc.1** 都能正常加载并注册设置开关（此前 0.2.6 沿用 0.1.2 的 `installSection`，在旧版 DSH 上会报 “Failed to load plugins”）。
2. **左缘定位条**：仍与官方新功能冲突、且依赖 `react-dom`，继续暂缓显示（本次兼容不恢复它）。

### 0.2.8（已发布）—— 旧版 DSH（无右缘 TurnNavigator）整套可用

1. **折叠/分隔线兼容回退**：折叠分组在 `data-chat-turn` 缺失（旧版 DSH 0.1.0-rc.7 ~ 0.1.1-rc.x）时，回退到从 `data-chat-anchor-key` 解析 turn 号（v0.2.5 做法），让折叠/分隔线在旧版 DSH 也生效（0.1.2+ 仍走 `data-chat-turn`，行为不变）。
2. **左缘定位条确认可用**：旧版 DSH 没有官方右缘 TurnNavigator，旧槽 `conversation.session.header.utilities` 存在且被渲染、所需 DOM 锚点均在（0.1.1-rc.2 源码确认）——**旧版 DSH（0.1.0-rc.7 ~ 0.1.1-rc.x）定位条可正常使用**（navigator 开）；DSH 0.1.2+ 因有官方右缘 TurnNavigator 仍暂停。

### 0.2.9（已发布）—— 调色盘配色 + 折叠残留标记修复

1. **配色改为调色盘**：定位条默认色 / 强调色由「色系 × 明度」chip 改为「自动 / 自定义」二选一；自定义 = 原生取色器无极调色 + HEX/`rgb()`/`rgba()` 文本输入 + 透明度滑杆，实时色块预览。host schema 新增 `navColorCustom` / `navAccentCustom`（旧色系值仍兼容解析）。
2. **修复折叠残留标记（issue #12 疑似根因）**：`applyFold` 只遍历本轮判定要折叠的行，若某行从「整行折叠（whole）」变成「只折叠思考（inline）」，旧的 `data-tidychat-folded` 不会被移除 → 该行被 CSS 永久隐藏（含总结正文），直到刷新页面。现在每轮重算前先统一清理标记再按本轮判定重打（同任务内完成，不闪烁）；同时修复「关闭 fold 开关后先前折叠的行仍隐藏」。
3. **修复悬停摘要文字色被换肤覆盖**（PR #9，issue #11）：`.tidychat-nav-tip` 双类名 + `!important`，`applyTipContrast()` 的 token 读取源由 `documentElement` 改为 `document.body`（DSH 的 `--dsw-alias-*` token 定义在 body，html 上读不到）。

### 0.2.10（已发布）—— 接管官方消息轨 + 消息轨样式完善

1. **新增「接管官方消息轨」开关**（默认关）：在 **DSH 0.1.2+** 上隐藏官方原生右缘 TurnNavigator，由本插件消息轨接管。至此**消息轨在 0.1.0-rc.7 ~ 0.1.2-rc.1 全区间可用**。
   - 实现是**隐藏而非卸载**：宿主没有提供原生开关，插件不能阻止官方组件挂载。隐藏通过根元素属性 `data-tidychat-hide-official-nav` + CSS 规则完成，React 重渲染不会还原；关闭时属性被移除，官方轨立即恢复。
   - 选择器不硬编码官方 CSS Module 的 hash（`eGxaPq_*` 随构建变化），改用「局部名子串 + 结构 + 内联 `--turn-natural-position` 变量」三重锚定。
   - 开启后官方组件仍在挂载状态，但绘制、布局、交互与滚动跟随全部停止（隐藏只减少工作量，不增加开销）。
2. **新增「外圈」样式开关**（默认关）：在当前轮与悬停轮的标记外描一圈强调色（1px 描边、外扩 2px），横线取胶囊形、圆点取正圆环。颜色跟随现有「强调色」，不新增配色项。
3. **修正「竖条」误标为「横线」**：显示样式选项一直写作「竖条」，但绘制代码是 `fillRect(x, y, width, height)` 且宽（14–26px）远大于高（3px）——**从来就是横线**，仓库内也从未有过竖线绘制元件。本次把 UI 选项、注释与设置提示统一改为「横线」，与 README「条状导航」的既有描述一致。两档样式（横线 / 圆点）的绘制代码一行未改。
4. **订正文档中不成立的「依赖 react-dom」结论**：`git grep react-dom` 在源码中零命中，构建产物唯一的 `require()` 实参是 `react`；定位条只用 `useState/useRef/useEffect/createElement`。该说法源自 v0.2.6 之前就已删除的一套临时 DOM 实现，属陈旧误诊，本次一并更正。

> 📌 **备用主线 `shadow/main`**：指向 `upstream/main`（v0.2.9 纯净主线，已 `--unset-upstream` 避免误推）。用途：`feat/rail-mirror-and-dots`（左右镜像 + 圆点，5 个提交）尚未被上游接受，若最终无法合并，可从这条纯净主线重新出发。
>
> ⚠️ **实测：整提交 cherry-pick 到 `shadow/main` 需要手工解冲突**（`src/index.ts` 2 处、`src/client/index.ts` 9 处）—— 因为本次改动与该 feature 在同一文件内交错。冲突都是小块的（配置字段、设置项、绘制循环附近），但**不是**一键可摘。若确需「无 feature + 官方接管」的版本，建议以 `shadow/main` 为起点手工移植接管开关的四个部分：CSS 规则、`applyOfficialNavTakeover()`、两个配置字段（`hideOfficialNav` / `navRing`）、一个设置项。

### 未发布 —— 修复消息轨在 DSH 0.1.2+ 不渲染（取数路径）

1. **根因**：消息轨的用户轮来自 `session.getSnapshot()`，但 DSH 0.1.2+ 的这个快照只返回**会话控制状态**（`queue` / `running` / `hasMore` / `openState`…），**没有消息节点字段**。插件仍按旧假设读 `snapshot.nodes` → `Array.isArray()` 为 false → 解析出 0 个用户轮 → 组件 `return null`，**零 DOM、控制台无报错**。这就是 0.2.6 起「左缘定位条暂缓」的真实原因（当时误判为「与官方轨冲突 / 依赖 react-dom」）。
2. **修复**：取数路径改为 `binding.eventSource.getSnapshot().entries`——会话事件窗（`SessionEventSource`），与官方 TurnNavigator 及生态内其它消息轨插件同源。用户轮判定 = 条目 `type === 'event'` 且 `event.type === 'user/message'` 且 `data.source.kind === 'user'`（**必须按 source 过滤**：agent 注入的 system prompt、skill 目录、后台任务通知都复用 `user/message` 这个事件类型）。悬停卡时间直接用事件的 `time`（Unix 毫秒）。
3. **订正 0.2.10 的结论**：0.2.10 写「至此消息轨在 0.1.0-rc.7 ~ 0.1.2-rc.1 全区间可用」——不成立。0.1.2+ 上轨道**从未渲染过**（取数路径 bug），本次修复后该结论才真正成立。
4. **默认值订正**：`navigator` / `autoLoad` 的 schema 默认值由 `false` 改为 `true`（新装用户默认即可见轨道）。**已装用户不受影响**：schemastery 会把旧默认值物化进设置，历史配置里的 `navigator: false` 需要到「设置 > 插件配置」手动打开。
5. **验证**：在 194 个真实会话日志上回放事件窗解析（0 解码失败），最大 63 个用户轮；同一份数据下旧实现恒为 0 轮。

### 下一版本（候选）

1. **Turn Index 层** —— conversation DOM → Turn Index（id/element/position/summary），fold/navigator/autoload 共享索引，替代每次全量扫描；基于索引的增量维护（等真实 500+/1000+ 行数据再定方案）。
2. **运行中回合的已完成步骤折叠**（issue #2）—— 单轮内 LLM 执行大量动作时，运行中实时折叠已完成步骤。需求强度待验证。
3. **向上游提 issue**：建议 DSH 为原生 TurnNavigator 提供开关（或槽位覆盖），让第三方插件能真正做到「逻辑关闭」而非仅隐藏；并考虑把 rail items 从「全会话大纲」改为「仅已加载窗口 + 懒加载」，以降低超长会话的标记数。

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
- **左缘定位条**：聊天区边缘的细窄条状导航，悬停显示摘要、点击跳转到对应消息；贴边与样式可在下方调整。
- **接管官方消息轨**（默认关）：隐藏 DSH 0.1.2+ 原生右缘 TurnNavigator，由本插件消息轨接管。**是隐藏而非卸载**，官方轨仍会挂载；定位条本身关闭时请勿开启，否则将没有任何消息轨。
- **智能加载更早历史**：页面空闲时逐步加载更早记录；检测到页面响应下降时自动暂停，保持长会话流畅，需要时仍可手动继续。
- **显示位置**：`左缘` / `右缘（镜像）`。右缘时整体镜像——横线从右缘向左生长、强调三角指左、悬停摘要卡从鼠标左侧弹出。
- **显示样式**：`横线` / `圆点`。两者都保留鱼眼放大（悬停邻域标记放大）与点击跳转。
- **外圈**（默认关）：在当前轮与悬停轮的标记外描一圈强调色（1px 描边、外扩 2px）；横线为胶囊形、圆点为正圆环。颜色跟随下方「强调色」。
- **配色（高级，卡片内可折叠）**：**默认色**与**强调色**各自「自动 / 自定义」二选一。**自动**：默认色优先用宿主淡色文字色，与聊天区背景对比不足时自动切纠偏灰（深背景淡灰、浅背景深灰）；强调色跟随主题品牌色（`--dsw-alias-state-business-primary`）。**自定义**：调色盘无极调色（原生取色器），或直接输入 HEX / `rgb()` / `rgba()` 精确定位，另有透明度滑杆；**强调色**控制「当前轮次 + 悬停回合」的高亮色，也是外圈的描边色。

## 🔧 原理

纯浏览器半（`exports "./client"`）实现，host 半只注册 settings 命名空间，不修改任何 DSH 源码：

- 折叠 / 分隔 / 导航全部通过 DOM 结构锚点（`data-chat-anchor-key`、`data-variant="think"` 等契约级属性）定位，不依赖编译期 hash 类名；
- 通过 `MutationObserver` 观察会话 DOM，配合定时兜底扫描，处理流式渲染与历史加载带来的 DOM 变化；
- 展开 / 收起状态为会话内内存态，刷新后恢复默认（全部折叠）；
- 「接管官方消息轨」同样不依赖编译期 hash：官方 TurnNavigator 的类名是 CSS Module 产物（`<hash>_slot` / `<hash>_frame`），插件改用**局部名子串 + 结构 + 官方每轮必写的内联 `--turn-natural-position` 变量**三重锚定，关闭时仅移除根元素上的 `data-tidychat-hide-official-nav` 属性即可恢复。

## 🧑‍💻 开发

```sh
pnpm install
pnpm run build      # tsdown 构建 lib/
pnpm run typecheck
```

## 📄 License

MIT
