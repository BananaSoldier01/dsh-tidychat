# 排查交接：消息轨（canvas）在 DSH 0.1.2-rc.1 上不渲染

> 交接对象：任何接续排查的 Agent / 协作者。
> 本文件只写**已验证的事实**与**可执行的检查步骤**；所有推测都明确标为「假说」。
> 生成时间：2026-09-11 ｜ 插件 `dsh-tidychat` @ 分支 `feat/rail-mirror-and-dots`

---

## 0. 一句话结论（当前状态）

**「接管官方消息轨」开关是有效的**（官方 14 个标记仍在 DOM、可见数为 0），**但本插件自己的 canvas 消息轨在 DOM 里根本不存在** —— 不是被隐藏，是**从未生成**。

所以两条链路必须分开看：

| 链路 | 状态 |
|---|---|
| 接管链路（CSS 隐藏官方轨） | ✅ **已验证通过** |
| 渲染链路（生成自己的 canvas 轨） | ❌ **断裂，组件未产出任何 DOM** |

---

## 1. 问题定义

| 项 | 内容 |
|---|---|
| 宿主 | DSH `0.1.2-rc.1`（`C:\nvm\v22.22.1\node_modules\@deepseek-ai\dsh`） |
| 插件 | `@bananasoldier01/dsh-tidychat` v0.2.10（link 模式指向本地仓库） |
| 现象 | 开关打开、配置正确、空间足够，但页面上没有消息轨 |
| 已确认 | `document.querySelector('.tidychat-nav-rail')` → `null`；`.tidychat-nav-canvas` → `null` |
| 已确认 | 接管属性 `data-tidychat-hide-official-nav` 存在；官方轨可见数 = 0 |
| 未确认 | 组件是否被渲染过？渲染时是否抛错？四道判空各是什么值？ |

---

## 2. 问题一：消息轨是什么样式？

### 2.1 实现形态（不是 DOM 节点树，是 canvas 位图）

```
<div class="tidychat-nav-rail"        position: fixed; z-index: 40; padding: 6px 2px
     style="left: <px>; top: <px>; transform: translateY(-50%)">
  └─ <canvas class="tidychat-nav-canvas">   ← 唯一的绘制载体，全部标记画在这一张位图上
</div>
<div class="tidychat-nav-tip tidychat-nav-tip">  ← 悬停摘要卡，仅在悬停时存在
```

**关键**：整条轨**只有 1 个 canvas 元素**，标记数量与 DOM 节点数无关（每轮标记是 canvas 上的一次 `fillRect`/`arc`）。所以「DOM 里找不到 canvas」＝ 轨完全没渲染，不存在「画了但没画上」的中间态。

### 2.2 注册方式

```ts
ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register(
  { name: 'conversation.session.header.utilities', id: 'tidychat-nav' },
  (props) => { /* RailView */ },
))
```

槽位契约（已核对 `dsh-client-ui-conversation/lib/types/client/contract/slots.d.ts`）：

| 属性 | 值 |
|---|---|
| kind | `list` |
| scope | `session` |
| owner | `ConversationHeaderActionOwnerProps`（**无可传值**：`children?: never`） |
| 宿主渲染点 | `dsh-client-ui-conversation/lib/client.js`：`renderSlot("conversation.session.header.utilities", {})` |

**已核对**：`ctx.slots.inject(name, cb)` + `ctx.slots.register({name, id}, Component)` 在 0.1.2-rc.1 是**正确 API**。证据：DSH 内置包大量使用同一形式（`dsh-client-ui-jobs`、`dsh-client-ui-schedule`、`dsh-session-log-export` 等 60+ 处），且 `dsh-cordis-client-runner` 的槽位文档示例正好包含 `conversation.session.header.utilities` 这一条。
→ **假说 H4（API 不存在）基本可排除**，但仍需探针确认回调是否真的执行。

### 2.3 当前生效的样式配置

来自 `C:\Users\joshua\.dsh\settings.yaml` 的 `tidychat:` 段（实测）：

```yaml
tidychat:
  navigator: true                                  # 消息轨总开关：已开
  hideOfficialNav: true                            # 接管开关：已开
  navSide: right                                   # 贴右缘（镜像）
  navStyle: dot                                    # 圆点
  navColor: custom
  navColorCustom: rgba(59, 72, 247, 0.45)          # 半透明蓝
  navAccent: blue                                  # 强调色（外圈也用这个）
  navColorLight: l1
  navAccentLight: l4
  # navRing 未显式存 → 应为 schema 默认 false
```

**若轨能渲染出来，外观应该是**：贴会话区右缘、一串半透明蓝色小圆点（常态半径 2.5px，鼠标附近 3.2px，当前/悬停 4px），无强调三角，悬停弹出摘要卡（从鼠标左侧展开）。

### 2.4 位置与尺寸算法（含实测值）

```
NAV_RAIL_WIDTH = 48

host    = document.querySelector('[data-conversation-scroll]')
r       = host.getBoundingClientRect()          ← 实测 900 × 881，right = 1180
content = [data-composer-card] ?? [data-chat-anchor-key]   ← 实测取到 composer
c       = content.getBoundingClientRect()       ← 实测 right = 1086

navSide === 'right':
    gutter = r.right - c.right                  ← 实测 94
    left   = r.right - (48 - 4) = 1180 - 44 = 1136
    top    = r.top + r.height * 0.5
```

---

## 3. 问题二：元素到底存不存在？隐藏还是没画？

### 3.1 实测结论：**从未生成**

Console 实测（用户执行，原样记录）：

```json
{
  "2_rail容器在DOM": false,
  "3_canvas在DOM": false,
  "5_官方轨仍在挂载(应>0)": 14,
  "6_官方轨可见数(应=0)": 0,
  "7_host找到": true,
  "8_host尺寸": "900x881",
  "9_host右边": 1180,
  "10_content是谁": "composer",
  "11_content右边": 1086,
  "12_gutter(需>=48)": 94,
  "13_会话轮数(DOM)": 2,
  "14_allRows": 150
}
```

### 3.2 与官方轨的对照 —— 两种「没有」要分清

| | 官方 TurnNavigator | 本插件消息轨 |
|---|---|---|
| DOM 节点 | **存在**（14 个 `style*="--turn-natural-position"`） | **不存在**（0） |
| 可见性 | `display:none`（接管 CSS 生效） | 无节点可谈 |
| 性质 | **被隐藏**（隐藏≠卸载） | **未生成** |

→ 官方轨那条链路已收工；本插件这条是**纯渲染问题**，与接管无关。

### 3.3 已排除的判空

| 判空（代码顺序） | 实测值 | 判定 |
|---|---|---|
| `!enabled`（`config.navigator`） | 配置为 `true` | ✅ 通过 |
| `pos === null`（host 找不到 / 尺寸 <10×10） | host 找到、900×881 | ✅ 通过 |
| `pos.gutter < NAV_RAIL_WIDTH`（<48 隐藏） | **94 ≥ 48** | ✅ 通过 |
| `users.length === 0`（快照解析出 0 个 user 轮） | **未知** | ⚠️ **首要嫌疑** |
| （组件是否被渲染过） | **未知** | ⚠️ **同等嫌疑** |

> 注意：会话在 DOM 里有 2 个 user 轮（`13_会话轮数`），但 `users` 来自**会话快照**而非 DOM。DOM 有 ≠ 快照有。

---

## 4. 环境事实（接续者可直接使用）

### 4.1 路径

| 角色 | 路径 |
|---|---|
| 插件仓库 | `E:\test\rewrite-agently\mine-dsh-plugins\dsh-tidychat` |
| 分支 / 提交 | `feat/rail-mirror-and-dots` @ `ddd4168`（含未提交的临时探针改动） |
| 已装载的插件 | `C:\Users\joshua\.dsh\profiles\web\node_modules\@bananasoldier01\dsh-tidychat` → **SymbolicLink** → 仓库 |
| 宿主 DSH | `C:\nvm\v22.22.1\node_modules\@deepseek-ai\dsh`（v0.1.2-rc.1） |
| 官方轨实现 | `…\dsh\node_modules\@deepseek-ai\dsh-client-ui-chat\lib\client.js`（搜 `TurnNavigator`） |
| 槽位实现 | `…\dsh\node_modules\@deepseek-ai\dsh-client-ui-renderer\lib\client.js`（搜 `SlotCore`） |
| 槽位纯内核 | `…\profiles\web\node_modules\@deepseek-ai\dsh-client-ui-slots\lib\index.js` |
| 配置存储 | `C:\Users\joshua\.dsh\settings.yaml` → `tidychat:` 段 |
| 0.2.8 备份 | `C:\Users\joshua\.dsh\_backups\dsh-tidychat-0.2.8\` |

### 4.2 link 模式已建立

```
profile package.json:  "@bananasoldier01/dsh-tidychat": "link:E:/test/rewrite-agently/mine-dsh-plugins/dsh-tidychat"
dsh.profile.bundles:   含 @bananasoldier01/dsh-tidychat
```

### 4.3 开发循环

| 改了什么 | 生效方式 |
|---|---|
| `src/client/index.ts`（渲染逻辑，本次主战场） | `pnpm build` → 浏览器硬刷新（**不用重启**） |
| `src/index.ts`（schema / 开关定义） | `pnpm build` → **重启 `dsh web`** |

```powershell
Set-Location "E:\test\rewrite-agently\mine-dsh-plugins\dsh-tidychat"
pnpm typecheck ; pnpm build
```

### 4.4 检查构建是否真的生效

```powershell
(Get-FileHash "E:\test\rewrite-agently\mine-dsh-plugins\dsh-tidychat\lib\client.js" -Algorithm SHA256).Hash
(Get-FileHash "C:\Users\joshua\.dsh\profiles\web\node_modules\@bananasoldier01\dsh-tidychat\lib\client.js" -Algorithm SHA256).Hash
# 两个哈希必须相同（软链应保证相同）
```

> 注意：仓库里 `lib/client.js` 是 **CRLF**（git checkout 转换），tsdown 直接输出是 LF。用哈希对比时以仓库工作区文件为准（当前 `FECC9B88…`）。

---

## 5. 假说清单（按可能性排序）

### H1 — 组件渲染时抛错，被槽位边界「摘除」（abdicate）★ 最高嫌疑

**机制**（已在源码中确认）：`dsh-client-ui-slots/lib/index.js` 的 `SlotCore.reportEntryError(key, entry, error, { abdicate: true })` 会把该 entry 从它的 cell 里**永久退休**（`abdicated` WeakSet），`entriesOfSlot()` 从此不再返回它 → **DOM 里什么都没有，且不一定有明显的红色报错**。

**为什么可疑**：现象是「零 DOM + 无报错」，与 abdicate 的表现完全一致。

**组件内可能抛错的点**：
- `ctx.sessions.binding(sid)` / `face.getSnapshot()` / `face.subscribe()` —— 若 0.1.2 的 sessions 客户端 API 变了
- `props.sessionId` 为 undefined 时后续访问
- `ResizeObserver` 相关（组件内 new）
- 任何 `React.useState` 之后的副作用

**检查方法**：探针 `window.__tidychatRailSlot.renderCount > 0` 且 `__tidychatRailDebug` 停在某个中间态 → 支持 H1。同时看控制台是否有 React 错误边界日志。

---

### H2 — `users.length === 0`：会话快照结构与代码假设不符 ★ 同等嫌疑

**代码假设**：
```ts
snap = face.getSnapshot()
snap.nodes[] 中 node.kind === 'user'
node.content[] 中 block.text 是 string
```

**为什么可疑**：DOM 里有 2 个 user 轮，但快照是另一条数据源。插件自己的诊断代码里就有「会话快照轮次 vs DOM 轮次」对照项 —— 作者早已知道两者会不一致。

**检查方法**：探针 `__tidychatRailDebug.users`、`.nodesIsArray`、`.nodesLen`、`.nodeKinds`、`.firstNodeKeys`。
- `nodesLen > 0` 但 `nodeKinds` 不含 `'user'` → **快照 kind 语义变了**，改判定条件
- `nodesIsArray === false` 或 `snapshotNull === true` → **取快照的方式变了**，改取数路径

---

### H3 — `pos === null`（本项实测已通过，保留备查）

`measurePos()` 依赖 `[data-conversation-scroll]`。**已确认该属性在 0.1.2-rc.1 仍存在**（`dsh-client-ui-conversation/lib/client.js` 渲染 `"data-conversation-scroll": ""`）。
实测 host 900×881 → 通过。**故 H3 排除**（除非在别的时机被调用时 host 尚未挂载 —— 组件有 `refresh()` + ResizeObserver，理论上会补上）。

---

### H4 — 槽位未声明 → `inject` 回调不执行（基本排除）

`conversation.session.header.utilities` 已确认在 0.1.2-rc.1 被渲染，且 API 用法与官方一致。
**残留风险**：`.utilities` 只在 `sessionId !== undefined` 时才渲染（外层 `conversation.session.header` 有这个前置判断）。若当前会话处于「未选中会话」状态，槽位整体不渲染。→ 探针 `__tidychatRailSlot.callbackRan` 可判定。

---

### H5 — 渲染成功了但被 `position: fixed` 包含块问题甩到屏幕外（**当前不适用，修好 H1/H2 后必查**）

`.tidychat-nav-rail` 是 `position: fixed`，`left/top` 用的是**视口坐标**（来自 `getBoundingClientRect()`）。
若任一祖先有 `transform` / `filter` / `backdrop-filter` / `contain: layout|paint` / `container-type` / `will-change`，`fixed` 的包含块会变成该祖先，坐标就全错位，元素可能跑到可视区外。

**已知风险点**：官方 ChatView 的 `.EvIC1a_scroll` 带 **`container-type: inline-size`**（隐含 `contain: layout inline-size style`）。若槽位被渲染进这个子树，`fixed` 会以它为包含块。
**检查方法**：元素存在但 `getBoundingClientRect()` 落在视口外，或 `offsetParent !== null`（fixed 元素的 offsetParent 应为 null）。

---

## 6. 已装入的探针（决定性，无需再改代码）

两份探针已在当前构建里（`lib/client.js` 哈希 `FECC9B88…`）。**必须硬刷新（Ctrl+Shift+R）**。

### 6.1 `window.__tidychatRailSlot` —— 槽位层

| 字段 | 含义 | 判读 |
|---|---|---|
| `injectCalled` | `apply()` 执行到了槽位注册那段 | 恒 `true`；若为 undefined → 客户端半整体没加载 |
| `callbackRan` | `slots.inject` 的回调执行了 → **该槽在宿主里已声明** | `false` → H4：槽位未声明 |
| `registerReturned` | `slots.register` 正常返回 | `false` → 看 `lastError` |
| `lastError` | 注册期异常信息 | 非 null → 直接是根因 |
| `renderCount` | 组件被渲染的次数 | **`0` → 组件从未渲染**；`>0` → 组件在跑，走判空分析 |

### 6.2 `window.__tidychatRailDebug` —— 组件内部层

| 字段 | 含义 |
|---|---|
| `enabled` | 消息轨总开关值 |
| `posNull` / `gutter` | 位置测量结果 |
| `navSide` / `navStyle` / `navRing` | 当前样式配置 |
| `users` | **快照解析出的 user 轮数（H2 的核心指标）** |
| `sid` | 槽位传入的 sessionId；`(none)` → 槽位没传 sessionId |
| `snapshotNull` | `getSnapshot()` 是否返回空 |
| `nodesIsArray` / `nodesLen` | 快照 `.nodes` 结构 |
| `nodeKinds` | 快照里实际出现的 `kind` 值集合 |
| `firstNodeKeys` | 首个节点的字段名（判断结构是否改版） |
| `wouldRender` | 四道判空的合取结果 |

### 6.3 执行步骤

```js
// 1) 硬刷新后，在 Console 依次执行：
window.__tidychatRailSlot
window.__tidychatRailDebug

// 2) 同时看 Console 有没有红色报错（React 错误边界 / 槽位 entry 崩溃）
// 3) 顺手确认槽位里到底有没有本插件的 entry（需要宿主暴露的话可跳过）
```

---

## 7. 判定树：探针输出 → 根因 → 修法

| `__tidychatRailSlot` | `__tidychatRailDebug` | 结论 | 修法方向 |
|---|---|---|---|
| `undefined` | `undefined` | 客户端半整包没加载 | 查 `dsh.profile.bundles`、`dsh.client.inject`、构建产物 |
| `callbackRan: false` | `undefined` | **H4** 槽未声明 | 换槽（如 `conversation.session.header.actions`）或加声明等待 |
| `lastError` 非 null | `undefined` | 注册被拒 | 按错误信息修（大概率 `id` 重复或槽未声明） |
| `renderCount: 0` | `undefined` | 注册成功但从未渲染 | **H1**：entry 被摘除或槽渲染条件不满足；加错误边界捕获 |
| `renderCount: >0` | `users: 0` | **H2 命中** | 改快照取数/判定逻辑（比对 `nodeKinds`） |
| `renderCount: >0` | `sid: "(none)"` | 槽位未传 sessionId | 改从 `props` 别的字段取，或换槽 |
| `renderCount: >0` | `posNull: true` | 布局锚点当时不可用 | 修 `measurePos` 的重试时机 |
| `renderCount: >0` | `gutter < 48` | 留白不足 | 非 bug，属设计（但右缘模式见 §8.2） |
| `wouldRender: true` 但仍无 DOM | — | **H5** 定位错位 | 查祖先 `transform`/`contain`，改锚定策略 |

---

## 8. 顺带发现的确定缺陷（与本问题独立，但建议一并修）

### 8.1 schema 默认值与冻结方案不符

`src/index.ts`：

```ts
navigator: z.boolean().default(false),   // ← 冻结方案定的是 true
autoLoad:  z.boolean().default(false),   // ← 同上
```

客户端 fallback 写的是 `config.navigator = snap.value.navigator ?? true`，但 schemastery 会先把值**物化成 `false`**，`??` 永远不触发。
→ 现有用户因显式存了 `true` 而不受影响；**新装用户会默认看不到消息轨**。属真实偏差，需修。

### 8.2 右缘模式 gutter 可能被低估

`measurePos()` 取 `content = [data-composer-card] ?? [data-chat-anchor-key]` —— **优先取输入框**。右缘模式算 `gutter = r.right - composer.right`。若输入框比消息列更贴右边，gutter 会被低估，导致「明明有空间却隐藏」。
本次实测 gutter=94 通过，但这属**运气**而非设计保证。建议改为按 `navSide` 取更合适的参照物，或对左右取 min。

---

## 9. 参考：官方 TurnNavigator 的对照实现（同槽位生态的活样本）

若最终判断是槽位用法问题，可直接对照官方是怎么在**会话区内部**渲染一条轨的：

- 它**不用槽位**，而是由 `ChatView` 直接渲染（`dsh-client-ui-chat/lib/client.js`：`jsx(TurnNavigator, { items, activeTurn, busyTurn, onNavigate, t })`），挂在 `div.scroll` 里、消息列 `div.column` 之前
- DOM：`div.<hash>_slot`(sticky, height:0) > `nav.<hash>_frame`(absolute, 宽 28px) > `div.<hash>_scroller` > `div.<hash>_marks` > `div.<hash>_markPosition[style*="--turn-natural-position"]` > `button.<hash>_mark`
- 它自己带 `@container (width<=900px){ ._slot{display:none} }`

**启示**：本插件把轨注册进 **header 槽** + `position: fixed`，是绕开「没有会话区内部槽位」的权宜做法。若 H5 成立（包含块问题），更稳的路子是**改用 `conversation.chat.turnTail` 之类的会话区内部槽**，或直接用 `document.body` 上的 portal —— 但那会引入 `react-dom` 依赖，需重新评估。

---

## 10. 交付物清单（给接续者）

| 文件 | 说明 |
|---|---|
| `docs/RAIL-NOT-RENDERING-INVESTIGATION.md` | 本文件 |
| `src/client/index.ts` | 含临时探针（搜 `__tidychatRailSlot` / `__tidychatRailDebug`）；**定位完成后必须删除** |
| `lib/client.js` | 构建产物（git 跟踪），哈希 `FECC9B88…` |
| `../../.agents/plans/tidychat-official-rail-takeover/` | 本次改造的 spec / findings / checklist / tasks（工作区侧） |

**收尾提醒**：删掉探针后重新 `pnpm build`，并更新 `checklist.md` 的验证状态表 —— 目前 README 里「DSH 0.1.2+ 消息轨 ✅ 可用」仍是**未验证的设计意图**。
