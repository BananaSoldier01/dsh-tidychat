# dsh-tidychat 交接文档（HANDOVER）

> 面向：接续开发的新会话 / 新协作者。内容基于 **v0.2.10（feat/rail-mirror-and-dots）** 快照。仓库根目录：`/Users/wuke/工作文件/DeepSeek_Harness/dsh-tidychat`（本机 link 模式开发）。

---

## 0. 一句话背景

`dsh-tidychat` 是一个 **DSH（DeepSeek Harness）Web 插件**：把长会话整理成「可扫读、可跳转」的结论流——四个独立开关：自动折叠已完成轮次、思考↔正文分隔线、消息轨（Canvas minimap 全局导航）、智能加载更早历史；消息轨另有「显示位置（左/右）」「显示样式（横线/圆点）」「外圈（关/开）」三项，以及「接管官方消息轨」开关；外加「生成诊断报告并提交 GitHub issue」一键入口。**注意：消息轨在 DSH 0.1.0-rc.7 ~ 0.1.2-rc.1 全区间可用** —— 旧版无官方右缘 TurnNavigator，直接用；**DSH 0.1.2+ 需打开「接管官方消息轨」开关**隐藏官方轨后继任（默认关）。

- 仓库：https://github.com/BananaSoldier01/dsh-tidychat（owner：BananaSoldier01）
- fork：https://github.com/drscrewdriver/dsh-tidychat（origin；upstream = 上面的原仓库）
- npm：`@bananasoldier01/dsh-tidychat`（public，最新 **0.2.9**；0.2.10 尚未发布）
- 插件索引：**awesome-dsh-plugin 已收录**（PR #3067 合并，session 分类 + 截图），即 dsh-market 源
- 当前版本线：v0.2.0 → v0.2.10（0.2.0 导航条大版本；0.2.1 配色；0.2.2 提示卡可读性；0.2.3 配色/publish 准备；0.2.4 npm 元数据；0.2.5 Hardening；0.2.6 折叠/分隔线重做；0.2.7 settings API 向后兼容；0.2.8 旧版 DSH 折叠回退；0.2.9 调色盘配色；**0.2.10 接管官方消息轨 + 外圈 + 「竖条」误标修正**）
- 分支：`feat/rail-mirror-and-dots`（= `upstream/main` v0.2.9 + 镜像/圆点 feature + v0.2.10 改动）；`shadow/main` = 纯净 `upstream/main`，备用主线，见 §4.6

---

## 1. 项目目录

```
dsh-tidychat/
├── src/
│   ├── index.ts              # host 半：settings 命名空间注册 + z<Config> schema（z.union 枚举）
│   └── client/
│       └── index.ts          # 浏览器半：全部逻辑（约 2000 行单文件，尚未拆分）
├── lib/                      # 构建产物（git 跟踪！link 模式实际被服务的就是它）
│   ├── index.js              # host 半产物（~2.2 kB）
│   └── client.js             # 浏览器半产物（~72 kB）
├── assets/                   # 效果图：fold-collapsed/expanded.png、navigator.png、settings.png
├── docs/                     # PR 兼容性分析（顶部含 2026-09-11 订正说明）
├── screenshots.json          # awesome-dsh-plugin 新约定：本仓库声明截图（相对路径数组）
├── scripts/whitelist-patch.sh # DSH ≤ rc.6 的 settings 白名单补丁（幂等）
├── .github/ISSUE_TEMPLATE/   # bug_report.yml / feature_request.yml
├── cordis.patch.yml          # dsh.bundle 的 patch 声明
├── package.json              # 0.2.10；dsh.bundle 清单；peerDependencies（dsh-settings/react）
│                             # dependencies 仅 schemastery；files 白名单；prepublishOnly=pnpm build
│                             # ⚠️ 元数据冻结：除 version / description 外不得改动
├── tsdown.config.ts          # 构建配置；用 createRequire 读 package.json 版本 → __PLUGIN_VERSION__
├── tsconfig.json
├── README.md                 # 中文默认（npm/GitHub 首页展示）
├── README.en.md              # 英文全量版；两文件顶部互链
├── HANDOVER.md               # 本文件
└── LICENSE (MIT)
```

**相关外部目录（本机）**：
- 插件注册（link 模式）：`~/.dsh/profiles/web/node_modules/@bananasoldier01/dsh-tidychat` → 软链到上述仓库
- awesome-dsh-plugin 工作克隆：`/Users/wuke/工作文件/DeepSeek_Harness/awesome-dsh-plugin`（fork = BananaSoldier01/awesome-dsh-plugin，上游 remote = awesome-dsh-plugin/awesome-dsh-plugin，投稿分支 add/tidychat 已合并）

---

## 2. DSH 契约点（已验证 0.1.0-rc.7 → 0.1.1-rc.2 稳定）

- `settings.plugin.item`：**keyed 槽**（rc.7 起由 list 改为 keyed），注册必须 `key: 'tidychat'`（同命名空间），旧 `id` 写法会报 "Failed to load plugins"
- `conversation.session.header.utilities`：子槽列表，导航条组件注册 `id: 'tidychat-nav'`（order 100）。**已核实 0.1.2-rc.1 仍存在且被渲染**（契约 `dsh-client-ui-conversation/lib/types/client/contract/slots.d.ts`，实现 `lib/client.js` 的 `renderSlot("conversation.session.header.utilities", {})`）
- DOM 锚点：`data-chat-anchor-key`、`data-chat-flow-kind`（user / think / context …）、`data-variant="think"`、`[data-conversation-scroll]`、`[data-composer-card]`
- `conversationContextKey` = `${kind.length}:${kind}${id}`
- API：`settingsScope.bind({ namespace: 'tidychat' })`、`ctx.sessions.binding(sid)`、`installSettingsSection(ctx, ns, schema, entry, hooks)`
- 语义色 token：`--dsw-alias-label-primary/secondary/tertiary/caption`、`--dsw-alias-bg-layer-3`、`--dsw-alias-state-business-primary`、`--dsw-alias-border-l2`

### 2.1 官方 TurnNavigator 契约（v0.2.10 新增，接管开关用）

官方右缘轨在 `@deepseek-ai/dsh-client-ui-chat`（源路径 `packages/client/ui-chat/src/client/chat/TurnNavigator.module.css` + `lib/types/client/chat/TurnNavigator.js`）。

**DOM 结构**：

```
div.<hash>_slot                                z-index:7; position:sticky; height:0; pointer-events:none
└─ nav.<hash>_frame  aria-label=<i18n>         宽 28px；right: calc(12px - (side-clearance + 16px))；pointer-events:auto
   │  style="--turn-natural-height:…;--turn-rail-inset:…;--turn-scroll-top:…"
   └─ div.<hash>_scroller[.<hash>_fadeTop][.<hash>_fadeBottom]
      └─ div.<hash>_marks
         └─ div.<hash>_markPosition  style="--turn-natural-position: Npx"   每轮一个
            └─ button.<hash>_mark[._markActive|_markPreview|._markBusy|._markUnloaded]
```

**关键事实**：

- 类名是 CSS Module 产物，`<hash>`（如 `eGxaPq`）**随构建变化 → 禁止硬编码**
- `if (items.length < 2) return null` —— 少于 2 轮整体不渲染
- `React.memo(TurnNavigatorRail)` —— 只在轮次增删 / `activeTurn` 变化时协调，**不随流式 delta 重渲染**
- `railItems = mergeTurnRailItems(turnNavigationItems, turnOutline)` —— 映射**整个会话大纲**，未加载轮次也占位（`anchor.kind === 'unloaded'`）
- 固定间距 `TURN_SPACING_PX = 10`、内缩 `RAIL_INSET_PX = 6`、遮罩带 `FADE_PX = 24`
- 官方自带响应式关闭：`@container (width<=900px){ ._slot{display:none} }`

**插件的接管选择器（三重锚定，跨 hash 稳定）**：

```css
html[data-tidychat-hide-official-nav] [class*="_slot"]:has(> nav[class*="_frame"]),
html[data-tidychat-hide-official-nav] nav[class*="_frame"]:has([style*="--turn-natural-position"]) {
  display: none !important;
}
```

**语义边界（重要，勿被后人「优化」掉）**：接管是**隐藏而非卸载**。宿主没有原生开关，插件无法让官方组件 `return null`；也**绝不能改成 JS 删节点** —— 宿主 React 下次协调会还原，且对「自己受管却已被外部删除」的节点执行 `removeChild` 会抛 `NotFoundError`，可能连带炸掉整个 ChatView。开启接管后官方组件仍挂载，停掉的是绘制 / 布局 / 交互 / 滚动跟随（`viewHeight <= 0` 提前 return、`ResizeObserver` 无尺寸变化、`syncScrollState` 判等不重渲染、无命中测试故提示卡不渲染）。

---

## 3. src/client/index.ts 关键结构（行号会随改动漂移，用符号名检索）

| 区域 | 内容 |
|---|---|
| CSS 注入（折叠/分隔/接管规则/定位条/提示卡/设置卡样式） | `CSS` 模板串；接管规则在 `.tidychat-nav-rail` 之前 |
| `foldState`（`Map<sessionId, Map<turn, boolean>>` 会话隔离）+ AutoLoad Governor 常量/状态 + `activeSessionId` | |
| 主扫描 `scan()`：收集 turns → `applySurgery`（分隔线/折叠控制条）→ `applyFold` | |
| Smart AutoLoad Governor（`isGovernorBusy/scheduleNext/loadOnePage/pause`；软预算时间制） | |
| 诊断：`snapshotUserTurns()`、`detectIssues()`、`buildReport()`、`reportAndOpenIssue()` | |
| 颜色链：`parseRgba/parseRgb`、`findBackgroundRgb`、`isDarkBackground`、`contrastRatio`、`resolveNavColors`、`applyTipContrast`、`applyNavColors` | |
| **`applyOfficialNavTakeover()`**（紧邻 `applyNavColors`） | 切根元素 `data-tidychat-hide-official-nav`；4 个调用点：启动、设置订阅、扫描后兜底、卸载清理 |
| `roundRectPath()` + `NAV_RAIL_RING_W/OFFSET`（紧跟 `railHeight`） | `arcTo` 自绘圆角，不依赖 `ctx.roundRect` |
| RailView React 组件（`measurePos`/`layoutPositions`/`indexFromY`/`railHeight`/`rowCache`/`detectCurrent`/`jumpTo`/pointer rAF 节流/tip 提示卡） | 绘制循环内 `bar`/`dot` 两分支；循环后为 `boxOf()` + 外圈描边通道 |
| 设置卡片（`TidychatSettingsCard`：5 开关 + 位置/样式/外圈 + 配色高级折叠 + 诊断报告按钮） | 顶部常量 `NAV_SIDE_OPTIONS` / `NAV_STYLE_OPTIONS` / `NAV_RING_OPTIONS` |

---

## 4. 重要设计原则（历次讨论沉淀，改代码前先读）

1. **主题/颜色只跟随 DSH 语义 token，禁绝新增主题检测机制**：不做 `prefers-color-scheme` / `body[data-ds-dark-theme]` 硬编码。导航条 auto 与提示卡都只做「**保守兜底**」：仅在浮层背景**不透明**（alpha ≥ 0.85）且 token 与背景对比 <3:1 时才纠偏；**玻璃/半透明背景（如官方深色 `rgba(255,255,255,0.1)`）一律跳过，token 跟随**。
   - 历史教训（勿重蹈）：0.2.2 前期把半透明白当浅底 → 官方深色「暗底暗字」；后来加 alpha 合成 → 深蓝主题仍误判。最终方案 = 纯 token 跟随 + 不透明时才兜底。
2. **默认行为不得回归**：用户实测过「官方深/浅、玻璃皮肤、异常 token 皮肤」的明暗正确性，任何改动别破坏「跟随正文颜色」的直觉（`label-primary`/`label-secondary`）。
3. **工程收口优先于加功能**（GPT 评审结论，用户已采纳方向）：0.2.5 已做 foldState 隔离、rAF 节流、测量前不渲染、快照/DOM 一致性诊断；**纯函数抽取 + 单测 + CI 明确推迟到 0.3.0 前置**（理由：函数都在 `apply()` 闭包内、依赖活的 `config`，抽取需参数化；绝不能边移动边改逻辑——对比度/alpha 阈值是最容易出回归的领域）。
4. **版本节奏**：小修小补 0.2.x，新功能线 0.3.0（Contextual Follow-up，尚未开始）；README 路线图每个版本更新（章节 + 上一版标「已发布」+ 钉版示例 `#vX.Y.Z`），双语同步。
5. **社区约定**：截图声明在**本仓库** `screenshots.json`（相对路径数组）；给 awesome-dsh-plugin 提 PR 时 fork main 必须与上游同步、README 由 `scripts/generate-readme.mjs` 生成（不手编）。
6. **文案必须与绘制代码对齐（0.2.10 教训）**：显示样式选项曾长期写作「竖条」，而绘制是 `fillRect(x, y, width, height)` 且宽（14–26px）远大于高（3px）——**一直是横线**，仓库里从未有过竖线绘制元件。这个错误标签传播进了文档，甚至误导过一次方案设计（差点新增一个与之同形的「横线」档）。**改绘制参数时同步改所有提及该样式的文案，反之亦然**；`grep 竖条 src/` 应保持零命中。
7. **文档结论要能被 `git grep` 复核（0.2.10 教训）**：「定位条依赖 react-dom」写进了 README/HANDOVER 却没复核 —— 实际上 `git grep react-dom` 在源码零命中，构建产物唯一的 `require()` 实参是 `react`，该说法源自 0.2.6 之前就已删除的一套临时 DOM 实现。写「依赖 X」之前先 grep；发现不成立要主动订正。
8. **接管官方轨只能隐藏，不能卸载（0.2.10 结论）**：见 §2.1 语义边界。**禁止**改用 JS 删节点。

### 4.6 影子 main（`shadow/main`）

`feat/rail-mirror-and-dots` 的 5 个提交（`ab1cf5e` 镜像+圆点 / `263e363` 圆点修复 / `f2ac9de` 文案 / `f424c03` 合并 upstream / `a7699c1` 重建 lib）**未被上游接受**，因此保留一条可回退路线：

- `shadow/main` = 纯净 `upstream/main`（`dd8bf4f`，v0.2.9），已 `--unset-upstream` 避免误推
- **实测结论（勿轻信「可 cherry-pick」的说法）**：把 v0.2.10 整提交 `47cf2ee` cherry-pick 到 `shadow/main` **会产生冲突** —— `src/index.ts` 2 处、`src/client/index.ts` 9 处（另加 `lib/` 两个产物，产物本就该重建，可忽略）。原因：v0.2.10 的改动与该 feature 在**同一文件内交错**，且 `src/` 的冲突上下文里包含 feature 引入的 `navSide`/`navStyle` 行。
- 冲突都是小块的，但**不是一键可摘**。若确需「无 feature + 官方接管」的版本，正确做法是以 `shadow/main` 为起点**手工移植接管开关的四个部分**：
  1. CSS 三重锚定规则（插在 `.tidychat-nav-rail` 之前）
  2. `applyOfficialNavTakeover()` + 4 个调用点（启动 / 设置订阅 / 扫描兜底 / 卸载清理）
  3. `src/index.ts` 的两个配置字段（`hideOfficialNav` / `navRing`）+ schema 默认值
  4. 设置卡片的 `fields` 条目 + `NAV_RING_OPTIONS` + navLayout 组内的外圈 chipRow
- 外圈还额外依赖 `dot` 分支与 `mirror` 变量（feature 引入），影子版若不带 feature 则外圈只能作用于横线。

---

## 5. 开发 / 发布流程

### 开发（link 模式，即时生效）
```sh
pnpm install && pnpm run build   # 产出 lib/
# GUI：http://127.0.0.1:3080（浏览器），改完源码 pnpm build 后 Cmd+Shift+R 硬刷新
# 注意：bundle 无版本标记，别用版本号判断是否更新；验证项 → F12 Console：
#   typeof (window).__tidychatReport === 'function'  # 插件已注入
```

### 发布（每版固定 7 步）
1. 改代码 → `pnpm typecheck && pnpm build`
2. `package.json` bump；README 双语：路线图加新章节、上一版标「已发布」、钉版示例改新版本号
3. `git commit` + `git push origin main`
4. `git tag -a vX.Y.Z -m "…"` + `git push origin vX.Y.Z`
5. `gh release create vX.Y.Z --title … --notes …`
6. **`npm publish --access public`**（⚠️ **必须带 `--access public`**，否则 E402 私有包拦截；本机 ~/.npmrc 的 bypass-2FA token **只允许 publish**，unpublish / access 变更会 403——那类操作需普通 `npm login` + OTP）
7. 验证：`npm view`/curl registry —— **注意注册表约 2-3 分钟传播延迟**，成功消息后 packument 可能仍显示旧版本，稍候重试即可。

---

## 6. 测试速查（无头）

- 颜色决策矩阵的自动化验证法（Node + `--experimental-strip-types` 从源码提取真实函数再跑用例）——上次 10/10 用例见对话记录，可复用
- playwright-core 无头测试：装在 `/tmp/pwtest`（临时，重装即可）；headless 客户端**无法打开正在运行的会话**（只能打开旧会话，且能看到 DOM 但插件悬停工具链受限）——UI 目检最终仍需人工
- 决策矩阵关键用例（新增颜色逻辑时必须回归）：官方深色玻璃 SKIP、官方浅色 OK、异常不透明 token 皮肤 FIX、玻璃/color-mix SKIP、hex8/空格+斜杠 格式解析
- 常规目检清单：官方明/暗、玻璃皮肤、异常 token 模拟（console 覆写 `--dsw-alias-bg-layer-3`/`label-primary/secondary`）、悬停提示卡、折叠控制条、跨会话展开串扰、诊断报告
- **接管开关（0.2.10 新增）**，浏览器 Console：

  ```js
  // 1) 开关状态
  document.documentElement.hasAttribute('data-tidychat-hide-official-nav')
  // 2) 官方轨是否被隐藏（应输出 0）
  [...document.querySelectorAll('[class*="_frame"]')]
    .filter(n => n.tagName === 'NAV' && n.querySelector('[style*="--turn-natural-position"]'))
    .filter(n => getComputedStyle(n).display !== 'none').length
  // 3) 官方轨是否仍在 DOM —— 隐藏≠卸载，属预期（应 > 0）
  document.querySelectorAll('[style*="--turn-natural-position"]').length
  // 4) 插件消息轨是否在绘制
  !!document.querySelector('.tidychat-nav-canvas')
  ```
- **样式组合矩阵**：`横线/圆点` × `左缘/右缘` × `外圈 关/开` = 8 组逐项目检（绘制、悬停摘要、点击跳转、右缘摘要卡不溢出）
- **性能三态观测**：A 官方轨正常+插件关 / B 官方轨隐藏+插件开 / C 官方轨隐藏+插件关，比较 `document.getElementsByTagName('*').length` 与内存；**先测再决定是否优化**

---

## 7. 待办 / 路线图（截至 v0.2.10）

- **0.3.0 Contextual Follow-up**（用户已选中，未开工）：选中 Assistant 最终正文 → 浮出「添加到对话」→ Composer 上方引用卡片 → 发送时携带引用。V1 严格限定：只支持 Assistant 最终正文；内部抽象 `SelectionReference`（sessionId / anchorKey / selectedText / sourceType）
- **0.3.0 前置**：纯函数抽取（parseRgba/contrastRatio/layoutPositions/indexFromY/cleanTiming 等）+ vitest 单测 + GitHub Actions（install/typecheck/test/build）
- **TurnSnapshot → Incremental Turn Index**：推迟，等真实 500+/1000+ 轮数据（README 路线图已注明）
- **issue #2**：运行中回合的已完成步骤折叠（需求强度待验证）
- **向上游提 issue（0.2.10 建议）**：① 为原生 TurnNavigator 提供开关或槽位覆盖，让插件能真正「逻辑关闭」而非仅隐藏；② 把 rail items 从「全会话大纲」改为「仅已加载窗口 + 懒加载」，削减超长会话的标记数
- 大方向判断（GPT 评审共识）：**别再堆「会话管理小功能」**（搜索/Bookmark/Token 统计等），主线是 **Long Conversation UX**：少看无关过程 → 快速定位历史 → 针对具体内容继续交流

---

## 8. 社区与 issue 现状

- issue：#1–#4 已关（模板/修复），#6 已关（0.2.2 修复 + 回复），#7 已关（投稿感谢）
- PR：#5（drscrewdriver 配色）已合并；#3 早期合并；awesome-dsh-plugin #3067 已合并
- 贡献者：drscrewdriver（PR #5、issue #4/#6/#7）；维护者 = BananaSoldier01
- 投稿 fork：`/Users/wuke/工作文件/DeepSeek_Harness/awesome-dsh-plugin`（已合并；将来再投稿先 `git fetch upstream && git rebase upstream/main`）
