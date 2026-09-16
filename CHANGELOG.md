# Changelog

本文件记录 dsh-tidychat 的逐版本变更。README 只保留当前能力与用法，历史细节在此归档。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [0.3.0] — 2026-09-16

消息轨在 DSH 0.1.2+ 恢复渲染 + 接管 / 样式 / 首次引导。

> 本版合并了原计划作为 `0.2.10` 发布的内容（PR #10）、取数路径修复，以及维护者追加的首次引导等改动。`0.2.10` 从未发布到 npm，其内容随本版一起发布。

**根因修复：0.1.2+ 上消息轨其实从未渲染过**

1. **取数路径**：用户轮原先来自 `session.getSnapshot().nodes`，但 DSH 0.1.2+ 的该快照只返回**会话控制状态**（`queue` / `running` / `hasMore` / `openState`…），没有消息节点字段 → 解析出 0 个用户轮 → 组件 `return null`（**零 DOM、控制台无报错**）。现改为读会话**事件窗** `binding.eventSource.getSnapshot().entries`：条目 `type === 'event'` 且 `event.type === 'user/message'` 且 `data.source.kind === 'user'`（**必须按 source 过滤**——system prompt、skill 目录、后台任务通知都复用同一个 `user/message` 事件类型）。
   - 同时订正 0.2.6 起「左缘定位条暂缓」的误判：真实原因既不是「与官方轨冲突」，也不是「依赖 react-dom」（源码中该依赖零引用，产物唯一的 `require()` 实参是 `react`），而是上面这条静默失效。
2. **DOM 作单一事实源**：圆点的身份/数量/顺序取自 `data-chat-anchor-key` 行，事件流降级为「触发器 + 摘要/时间增强」；行采集器改认 `user | steering`（宿主把 agent 运行中用户插队渲染为 `steering`，漏掉会造成圆点与行错位：尾部点不动、滚到底当前轮高亮停在倒数第三）；补 `surfaceOp === 'append'` 过滤对齐宿主，诊断报告与性能日志复用同一口径。
3. **几何健壮性**：`measurePos` 的 gutter 参照改为「输入框卡片 + 首个/末个会话行」取最贴边者（防留白误判把轨隐藏）；滚动 rAF 内自检 `scrollHeight` 漂移并重建行缓存（懒加载图片/代码块改变行高时消除过期几何）。

**消息轨能力**

4. **左右贴边** `navSide: left | right`：右缘整体镜像——横线从右缘向左生长、强调三角指左、悬停摘要卡从鼠标左侧弹出。
5. **显示样式** `navStyle: bar | dot`：圆点模式保留鱼眼放大与点击跳转。顺带把误标的「竖条」统一改为「横线」（绘制一直是 `fillRect`，宽 14–26px × 高 3px）。
6. **外圈** `navRing`（默认关）：在当前轮与悬停轮的标记外描一圈强调色（横线取胶囊形、圆点取正圆环），颜色跟随「强调色」。
7. **接管官方消息轨** `hideOfficialNav`（默认关）：通过根属性 `data-tidychat-hide-official-nav` + CSS 规则**隐藏**（而非卸载）DSH 0.1.2+ 原生右缘 TurnNavigator；官方组件仍在挂载，关闭开关立即恢复。选择器不硬编码 CSS Module hash，改用「局部名子串 + 结构 + 官方每轮必写的内联 `--turn-natural-position`」三重锚定。
8. **默认值**：`navigator` / `autoLoad` 默认 `true`（新装开箱即有消息轨 + 自动加载更早历史）。**已装用户不受影响**——旧默认值已物化进设置，历史配置里的 `navigator: false` 需到「设置 → 插件配置」手动打开。

**首次引导与体验（维护者追加）**

9. **首次引导**：检测到「插件轨 + 官方轨并存」时，在 `shell.overlay` 弹一次向导——说明**左缘 = 插件 / 右缘 = 官方**，并给三个一键选项：`用插件的（隐藏官方轨）` / `用官方的（关掉插件轨并解除接管）` / `两条都留着`。`navGuideSeen` 记录是否已看过；设置卡片内另有「**重新显示首次引导**」可随时召回。旧版 DSH（无官方轨）不会弹。
10. **设置项重排与改名**：「显示位置 / 显示样式 / 外圈」移到「定位条」开关正下方；标签「左缘定位条」→「**定位条**」（配置键仍是 `navigator`，不动已发布的键名）。
11. **跳转滚动缓动**：原生 `behavior:'smooth'` → 自绘 rAF 动画（距离自适应 260–700ms + easeInOutCubic，可被滚轮/触摸/按键打断，尊重 `prefers-reduced-motion`）。

## [0.2.9] — 2026-09-09

调色盘配色 + 折叠残留标记修复。

1. **配色改为调色盘**：定位条默认色 / 强调色由「色系 × 明度」chip 改为「自动 / 自定义」二选一；自定义 = 原生取色器无极调色 + HEX/`rgb()`/`rgba()` 文本输入 + 透明度滑杆，实时色块预览。host schema 新增 `navColorCustom` / `navAccentCustom`（旧色系值仍兼容解析）。
2. **修复折叠残留标记（issue #12 疑似根因）**：`applyFold` 只遍历本轮判定要折叠的行，若某行从「整行折叠（whole）」变成「只折叠思考（inline）」，旧的 `data-tidychat-folded` 不会被移除 → 该行被 CSS 永久隐藏（含总结正文），直到刷新页面。现在每轮重算前先统一清理标记再按本轮判定重打（同任务内完成，不闪烁）；同时修复「关闭 fold 开关后先前折叠的行仍隐藏」。
3. **修复悬停摘要文字色被换肤覆盖**（PR #9，issue #11）：`.tidychat-nav-tip` 双类名 + `!important`，`applyTipContrast()` 的 token 读取源由 `documentElement` 改为 `document.body`（DSH 的 `--dsw-alias-*` token 定义在 body，html 上读不到）。

## [0.2.8] — 2026-09-07

旧版 DSH（无右缘 TurnNavigator）整套可用。

1. **折叠/分隔线兼容回退**：折叠分组在 `data-chat-turn` 缺失（旧版 DSH 0.1.0-rc.7 ~ 0.1.1-rc.x）时，回退到从 `data-chat-anchor-key` 解析 turn 号（v0.2.5 做法），让折叠/分隔线在旧版 DSH 也生效（0.1.2+ 仍走 `data-chat-turn`，行为不变）。
2. **左缘定位条确认可用**：旧版 DSH 没有官方右缘 TurnNavigator，旧槽 `conversation.session.header.utilities` 存在且被渲染、所需 DOM 锚点均在（0.1.1-rc.2 源码确认）——**旧版 DSH（0.1.0-rc.7 ~ 0.1.1-rc.x）定位条可正常使用**（navigator 开）；DSH 0.1.2+ 因有官方右缘 TurnNavigator 仍暂停。

## [0.2.7] — 2026-09-07

settings API 向后兼容。

1. **settings 注册自动适配**：宿主注册配置时按 DSH 版本自动选用 API——0.1.2+ 用 `installSection`，0.1.0-rc.7 / 0.1.1-rc.x 用 `register`——让同一份插件在 **DSH 0.1.0-rc.7 ~ 0.1.2-rc.1** 都能正常加载并注册设置开关（此前 0.2.6 沿用 0.1.2 的 `installSection`，在旧版 DSH 上会报 “Failed to load plugins”）。
2. **左缘定位条**：仍与官方新功能冲突、且依赖 `react-dom`，继续暂缓显示（本次兼容不恢复它）。（注：此判断后被 0.3.0 证伪，实际原因是取数路径静默失效。）

## [0.2.6] — 2026-09-06

折叠 & 分隔线重做；左缘定位条暂缓。

1. **折叠重做（Codex 式）**：只折叠思考（Think）+ 工具调用，保留用户消息和最终正式回复；控制条为「用时 X + 箭头 + 分隔线」，整条可点击，折叠时箭头朝右、展开时朝下；过程与正式回复之间再画一条分隔线。
2. **分隔线重做**：过程/回复分界改用行内分隔线（思考芯片 `::after` 绘制，React 重渲染不清除），并加深到 `rgba(96,96,96,0.85)`（对比度更清晰）。
3. **⚠️ 左缘定位条暂缓显示**：DSH 0.1.2-rc.1 起官方原生新增右侧 TurnNavigator 与原生折叠，与插件左缘定位条功能重叠；同时插件定位条依赖 `react-dom`（当前插件 / 宿主均未提供）。因此从本版起**左缘定位条不再显示**。是否保留、或改造成与官方新的导航/折叠协同，待后续版本再定（源码与历史截图保留）。
4. **折叠含重试提示（issue #8）**：DSH 把被重试的模型请求渲染为 `model-retry` 行（“已重试模型请求”），此前折叠不会收起它。本版起 `model-retry` 作为过程噪音随思考/工具调用一起折叠。

## [0.2.5] — 2026-08-26

Hardening（工程收口）。

1. **折叠状态会话隔离（P0）**：`foldState` 改为 `Map<sessionId, Map<turn, boolean>>`，修复跨会话同轮次串扰（会话 A 展开第 5 轮 → 会话 B 第 5 轮不再错误继承展开态）
2. **定位条 pointermove 节流**：高频移动只记录最新坐标，rAF 帧内统一处理一次（不再每事件一次 React 渲染）；离开/卸载时清理挂起帧
3. **测量前不渲染**：宿主布局未就绪（`pos === null`）时不再渲染到写死的 280px 猜测位，测量成功后再出现
4. **快照/DOM 轮次一致性诊断**：报告新增「会话快照轮次 vs DOM 轮次」对照，不一致时报 ⚠️（加载中或 DOM 更新滞后）
5. 文档钉版示例随版本更新；package description 补齐「智能加载更早历史」

## [0.2.4] — 2026-08-25

npm 包元数据刷新。功能零改动，仅 npm 包内容更新：`README.en.md` 纳入包内、`repository.url` 规范化（`npm pkg fix`）、双语 README 随包发布。awesome-dsh-plugin 收录 PR #3067 已合并（session 分类 + 截图条目）。

## [0.2.3] — 2026-08-24

npm 发布准备（awesome-dsh-plugin 投稿推荐项）。

1. **peerDependencies 化**：`@deepseek-ai/dsh-settings` 由 `dependencies` 移入 `peerDependencies`（官方运行时包由宿主 profile 提供，避免重复运行时）
2. **npm 发布**：`prepublishOnly` 自动构建，`@bananasoldier01/dsh-tidychat@0.2.3` 已公开发布（预构建产物，安装免 `allowBuilds` 授权）；推荐安装方式改为 `dsh plugin add @bananasoldier01/dsh-tidychat`
3. **投稿**：awesome-dsh-plugin 收录 PR 已提交（#3067，session 分类 + 截图条目），待维护者合并

## [0.2.2] — 2026-08-24

提示卡可读性（issue #6）。

1. **头部提级**：提示卡 `#序号 · 时间` 由最弱一级（`label-tertiary`）提升到 `label-secondary`，亮色主题下不再发虚；正文跟随 `label-primary`（与对话正文同色），明暗随主题自动切换
2. **保守对比度兜底**：仅当提示卡浮层背景「不透明」（`bg-layer-3` alpha ≥ 0.85）且 label token 与背景对比 <3:1 时才写纠偏色（亮底深字 / 暗底亮字）；玻璃/半透明浮层（官方深色等）一律跳过、跟随主题 token——避免误判深色玻璃
3. **长摘要折行**：`overflow-wrap: anywhere`，含长代码/URL 的摘要在卡片内折行不溢出
4. **解析增强**：颜色解析支持 `rgba` 逗号/空格+斜杠语法、`#rgb/#rgba/#rrggbb/#rrggbbaa`、`transparent`

## [0.2.1] — 2026-08-23

定位条配色完善（PR #5 合入）。

1. **背景真实冒泡**：默认色 auto 的背景判定从会话滚动容器沿父级向上冒泡找第一个非透明背景（alpha=0 跳过），不再只查固定候选
2. **auto 尊重主题**：默认色 auto 优先用宿主淡色文字色，与实际背景 WCAG 对比 ≥3:1 才使用，不足自动切纠偏灰；强调色 auto（默认）= 跟随主题品牌色（`--dsw-alias-state-business-primary`）
3. **配色折叠为高级项**：设置卡片内「配色（高级）」可折叠收起，明度档在 auto 时禁用
4. **配置枚举化**：host schema 四个配色字段改为 `z.union` 枚举收敛取值；插件卸载时清除写入 `:root` 的临时 CSS 变量

## [0.2.0] — 2026-08-22

Adaptive Conversation Navigation Rail——左缘定位条从「固定列表」升级为 **Canvas Minimap 全局导航**：

1. **固定高度**：`min(70vh, 660px)`，任意 turn 数量（20/70/200+）都映射在同一可视区内
2. **Turn 全局均匀映射**：`y = index/(total-1) × railHeight`，不随 turn 数增长 DOM（仅 1 个 canvas + 1 个提示卡）
3. **鱼眼 hover**：hover 附近 ±4 turn 间距放大、远处自动压缩，命中测试与绘制共用同一布局函数
4. **Drag scrubbing**：拖动时仅预览目标 turn，松手才跳转
5. **当前 turn 高亮**：以「阅读区顶部」为准（含 header 偏移），随滚动实时更新
6. **精确跳转**：用户消息滚到阅读区顶部（而非 viewport 中心或埋进 header）
7. **兼容性**：fold / divider / autoload / diagnostics 均不受影响（rail 数据来自会话快照，与折叠的 CSS 隐藏无关）

## [0.1.1] – [0.1.5] — 2026-08-19 ~ 2026-08-22

首个可用系列：已完成轮次自动折叠（只留最终结论）+ 思考↔正文分隔线 + 左缘固定列表式定位条 + 四开关设置面板 + 智能加载更早历史 + 一键诊断报告。细节未逐版收录。
