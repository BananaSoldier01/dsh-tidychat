# 消息轨不渲染 · 根因定位报告

> 结论性文档：记录 0.1.2+ 上消息轨不渲染的根因（§0-§5）与随后的两类错位修复（§6、§7）。
> 生成时间：2026-09-11（§6/§7 于 2026-09-12 追加）｜ 宿主：DSH `0.1.2-rc.1`
> 注：文中行号取自报告撰写时的工作副本，随改动会漂移，定位以函数名与代码片段为准。

---

## 0. 一句话结论

**渲染链路完全正常，问题在取数路径**：插件把 `session.getSnapshot()` 的返回值当成「会话消息树快照」来解析（期望有 `nodes[]`、`kind: 'user'`、`content[].text`），但 DSH 0.1.2-rc.1 中该接口返回的是**会话控制状态快照**（队列/连接状态），**根本没有 `nodes` 字段**。于是插件解析出 0 个用户轮 → 命中最后一道判空 `if (users.length === 0) return null` → 每次渲染都「正常地渲染出空」，零 DOM、零报错。

三个环节的真实状态：

| 环节 | 状态 | 说明 |
|---|---|---|
| 渲染机制（槽位注册 / React hooks / canvas 绘制） | ✅ 正常 | 无异常、无 abdicate |
| 消息数据本身 | ✅ 仍存在 | 在事件源 `eventSource` 和 DOM 里（DOM 实测 2 个 user 轮） |
| 插件的取数代码 | ❌ 读错路径 | `getSnapshot().nodes` 在 0.1.2-rc.1 不存在 |

---

## 1. 断链全过程（逐步）

```
Session.getSnapshot() 返回:
{ sessionId, queue, pendingSubmissions, running, subagent, removed,
  openState, openError, hasMore, loadingOlder, promptError, blank,
  lastAgentError, promptAttempted, awaitingFirstTurn }
        ↓  没有 nodes 字段
Array.isArray(snapshot.nodes) === false          ← src/client/index.ts L1686
        ↓
users = []（解析出 0 个用户轮）
        ↓
if (users.length === 0) return null              ← src/client/index.ts L1787（最后一道门）
        ↓
每次渲染返回 null → 零 DOM、零报错
```

注意：`return null` 不是渲染失败，是组件基于错误数据**判断该会话没有用户消息**，按设计不画。

---

## 2. 代码证据

### 2.1 插件侧的错误假设

`src/client/index.ts` L1685-1697：

```ts
const users: Array<{ seq: number; time: number; summary: string }> = []
if (snapshot !== null && snapshot !== undefined && Array.isArray(snapshot.nodes)) {
  for (const node of snapshot.nodes) {
    if (node === null || node === undefined || node.kind !== 'user') continue
    let text = ''
    if (Array.isArray(node.content)) {
      for (const block of node.content) {
        if (block !== null && block !== undefined && typeof block.text === 'string') text += block.text
      }
    }
    users.push({ seq: node.seq, time: node.time, summary: String(text).trim().slice(0, 120) })
  }
}
```

快照由组件 effect（L1632-1683）从 `binding.session.getSnapshot()` 拉取。

### 2.2 宿主侧的真实形状

`binding.session` 是 `@deepseek-ai/dsh-api-session-controller` 的 `Session` 对象。其 `getSnapshot()` 由 `buildSnapshot()` 构建：

- 文件：`C:\nvm\v22.22.1\node_modules\@deepseek-ai\dsh\node_modules\@deepseek-ai\dsh-api-session-controller\lib\client.js` **L1353-1374**
- 返回结构见 §1，**没有任何消息树字段**

### 2.3 binding 的完整形状（修复时可用的数据源）

`materializeScope()`（同文件 **L2557-2574**）：

```js
binding: { sessionId: id, session, eventSource: session.eventSource, ctx }
```

`eventSource` 是 `MutableSessionEventSource`：
- `getSnapshot()` → `{ entries, hasMore, revision, change }`，`entries` 是事件数组 `{ seq, type, data }`
- 支持 `subscribe(listener)`（现有 pull/订阅结构可直接复用）
- **只含已加载窗口**，与 DOM 行（也是已加载窗口）天然对齐

### 2.4 用户消息事件的真实形状

`@deepseek-ai/dsh-client-connection/lib/client.js`：

- **L2150**：`event.type === "user/message"` 时文本内容在 `event.data.content`（块数组）
- **L2669**：`event.data.source.kind === "user"` 用于过滤非真实用户的 echo
- **L659-668**：`deriveEventMessage()` 的对照实现

### 2.5 已排除的疑点（均为本次核验结论）

| 疑点 | 结论 | 证据 |
|---|---|---|
| H1 组件抛错被 abdicate | ❌ 排除 | 组件是正常 `return null`，不是抛错；无 React 报错边界日志路径 |
| React 拷贝不一致（hooks 崩溃） | ❌ 排除 | react 在 tsdown 里 external（`tsdown.config.ts` EXTERNALS），插件 bundle 经同一个 `__ModuleLoader__` require 解析，与宿主同实例 |
| H3 `pos === null` | ❌ 排除 | effect 正常执行了 `refresh()`，实测 gutter=94 |
| H4 槽位未声明 / `props.sessionId` 缺失 | ❌ 排除 | `conversation.session.header.utilities` 在宿主 `dsh-client-ui-conversation/lib/client.js` L14597 被渲染；session scope 适配器把 `sessionId` 列为标准 prop（`dsh-client-ui-session/lib/client.js` L61-70：`props: { sessionId: binding.sessionId }`），经 `standardKit` 的 `kit = {...standard}` 展开传入组件 |
| H5 fixed 包含块错位 | ❌ 排除（当前） | 元素从未生成，谈不上错位。修好后若仍不可见再查（ChatView `.EvIC1a_scroll` 带 `container-type: inline-size`） |

---

## 3. 为什么一直没被发现

1. **零报错**：`users.length === 0` 的 `return null` 是设计内行为，不是异常路径。
2. **插件自带诊断也失明**：`snapshotUserTurns()`（`src/client/index.ts` **L1040-1051**）有**同款错误假设**——`!Array.isArray(snap.nodes)` 时返回 -1，而诊断逻辑只在 `snapTurns >= 0` 时才报「快照/DOM 不一致」。所以一键报告永远不提示此问题。**修复时必须同步改这里。**
3. **折叠功能正常造成误导**：折叠（`applySurgery`）是纯 DOM 扫描，不依赖快照，跨版本一直可用——恰好掩盖了「快照取数」这条独立链路的问题。
4. README 里「DSH 0.1.2+ 消息轨 ✅ 可用」从未被验证过（原排查文档已注明），轨是按错误假设新写的，从未在 0.1.2 上工作过。

---

## 4. 探针预期输出（如需复核）

当前构建已含探针（`lib/client.js` 哈希 `FECC9B88…`，硬刷新后查看）。根因成立时应恰好为：

```json
{
  "__tidychatRailSlot": { "injectCalled": true, "callbackRan": true, "registerReturned": true, "lastError": null, "renderCount": ">0" },
  "__tidychatRailDebug": {
    "enabled": true,
    "posNull": false,
    "gutter": 94,
    "sid": "<真实会话id>",
    "snapshotNull": false,
    "nodesIsArray": false,
    "nodesLen": -1,
    "nodeKinds": null,
    "firstNodeKeys": null,
    "users": 0,
    "wouldRender": false
  }
}
```

对应原排查文档判定树第 5 行「`renderCount: >0` + `users: 0` → H2 命中」。

---

## 5. 修复方案

渲染链其余部分（槽位注册、effect、重绘、悬停、跳转）**一行都不用动**，只换取数路径。

### 方案 A（推荐）：改读事件源 `binding.eventSource`

```ts
// effect 内：const face = binding.eventSource（替代 binding.session 的快照角色）
const pull = () => {
  try {
    const s = face.getSnapshot()   // { entries, hasMore, revision, change }
    setSnapshot(s)                 // 组件内解析逻辑同步改为遍历 s.entries
  } catch { setSnapshot(null) }
}
```

组件内解析（替换 L1685-1697）：

```ts
const users: Array<{ seq: number; time: number; summary: string }> = []
// 事件窗条目是 { type: 'event' | 'chunks', event } 包装（SessionEventLikeEntry），
// 真正的会话事件在 entry.event —— 这一层在最初方案里被漏掉，按扁平结构写会恒不命中。
for (const entry of snapshot.entries) {
  if (entry === null || entry === undefined || entry.type !== 'event') continue
  const ev = entry.event
  if (ev === null || ev === undefined || ev.type !== 'user/message') continue
  const src = ev.data?.source
  if (src !== undefined && src !== null && src.kind !== 'user') continue  // 过滤注入 / echo
  let text = ''
  if (Array.isArray(ev.data?.content)) {
    for (const block of ev.data.content) {
      if (block !== null && block !== undefined && typeof block.text === 'string') text += block.text
    }
  }
  users.push({ seq: ev.seq, time: ev.time, summary: String(text).trim().slice(0, 120) })
}
```

要点：
- 事件窗的条目是 `{ type, event }` 包装，**不是**扁平事件；事件类型在 `entry.event.type` 上
  （宿主侧同一约定：`historyRecordFirstSeq(record) => record.event.seq`）
- `user/message` 的文本在 `data.content[]`（块数组），不是 `data.message.content`（那是 assistant/message）
- `data.source.kind === 'user'` 过滤 agent 注入与提交 echo
- 悬停卡时间用事件自带的 `time`：`SessionEvent` 定义里 `time: number` 是必备字段（Unix 毫秒），
  不需要另找来源
- `subscribe()` 语义兼容，现有 `unsub` 结构不变

### 方案 B（备选）：以 DOM 行为准

组件里已有现成的 DOM 采集器 `userRows()`（L1482，`[data-chat-anchor-key]` + `data-chat-flow-kind === 'user'`）和 `rowCacheRef` 行缓存（供跳转/当前轮检测用）。可直接以 DOM 行生成 `users`：

- `summary`：从行元素 `textContent` 截取
- 优点：与折叠功能同一套适配策略（跨 0.1.0-rc.7 ~ 0.1.2-rc.1 已验证）；与画布命中/跳转的行序天然一致
- 缺点：摘要文本受折叠/渲染状态影响；时间同样需要另找来源

### 无论选哪个方案都要同步修

| 位置 | 问题 | 修法 |
|---|---|---|
| `snapshotUserTurns()` L1040-1051 | 同款 `snap.nodes` 假设，诊断静默失效 | 与主逻辑同步改造（方案 A 下数 `entries` 中 `user/message` 且 `source.kind === 'user'`） |
| `src/index.ts` schema | `navigator: z.boolean().default(false)` 与冻结方案（true）不符；schemastery 把默认值物化成 `false`，客户端 `?? true` 永不触发，**新装用户默认看不到轨** | schema 默认值改 `true`（`navigator`、`autoLoad`），或客户端 fallback 改为显式判断 `undefined` |
| `measurePos()` L1400-1406 | gutter 只取单个参照元素（composer 优先），而输入框可能比消息内容更贴边，会高估/低估留白致轨被误隐藏 | 参照候选 = 输入框卡片 + 首个/末个会话行，取最贴边者（§7.2） |
| 收尾 | `src/client/index.ts` 内两处临时探针（搜 `__tidychatRailSlot` / `__tidychatRailDebug`） | 定位完成后删除并 `pnpm build`；更新 README 的验证状态表 |

### 验证步骤（修复后）

1. `pnpm typecheck ; pnpm build`，硬刷新浏览器（Ctrl+Shift+R）
2. 打开有历史消息的会话 → 会话区左缘应出现定位条（navigator 开关打开时）
3. 悬停出现摘要卡、点击跳转、滚动时当前轮高亮
4. 新建空白会话 → 轨隐藏（用户轮 = 0 属正常设计，此时不可作为失败判据）

---

## 6. 追加根因（2026-09-11）：尾部圆点点击失效 + 当前轮定位停在倒数第三

> §0-§5 的取数路径修复后，消息轨能渲染了，但暴露出两个新症状，**同一个根因**。

### 6.0 一句话结论

**宿主把用户消息渲染成两种 DOM 节点（`user` 和 `steering`），插件的圆点数组把两者都计入，但 DOM 行采集器 `userRows()` 只匹配 `user`** —— 于是「圆点数 > DOM 行数」，索引整体错位：尾部圆点映射到不存在的行（点击静默失效），当前轮检测的二分上限也停在错位后的最后一行（滚到底仍高亮倒数第三）。

### 6.1 症状

| 症状 | 表现 |
|---|---|
| 点击跳转不对称 | 位置上方的圆点点击有效；下方（尤其最后两个）点击无任何反应 |
| 当前轮定位钳制 | 滚动条拉到底，「当前 turn」高亮仍停在倒数第三个圆点 |
| 中段点击跳错 | 部分点击会跳到相邻的错误行（用户不易察觉，表现为「有反应」） |

### 6.2 根因链（宿主证据）

DSH 0.1.2-rc.1 宿主 `ui-conversation` 的消息分类 Definition
（`packages/client/ui-conversation/src/client/conversation-nodes/message.ts` `start()` L53-69）：

- `user/message` + `source.kind === 'user'` 的事件，若其 `data.id` 被 inbox 的 `claimed` 集合认领
  （= **agent 运行中用户插队发送的 steering 消息**）→ 节点 `kind: 'steering'`
- 未被认领（开新回合的普通消息）→ 节点 `kind: 'user'`

`ChatNodeSeat.tsx` L46 把节点 kind 原样写进 DOM：

```tsx
data-chat-flow-kind={routedNode.kind}   // 'user' 或 'steering'（同一事件流的两种落点）
```

宿主自己的 CSS 也始终把两者作为一类处理（`:is([data-chat-flow-kind='user'], [data-chat-flow-kind='steering'])`）。

而插件修复 §5 方案 A 后：

- **圆点数组 `users`**：遍历事件源 `entries`，凡 `user/message` + `source.kind === 'user'` 都计入
  → **steering 消息有圆点**
- **DOM 行采集器 `userRows()`**（修复前）：`data-chat-flow-kind === 'user'` → **steering 行被漏掉**

### 6.3 错位过程（以末尾 2 条 steering 为例）

事件流（seq 序）：`U1, U2, S1, U3, S2, U4`（S = steering）。圆点 6 个；`userRows()` 只找到 4 行（S1、S2 被过滤）：

| 圆点 index | 对应事件 | `jumpTo` 取 `rows[index]` | 结果 |
|---|---|---|---|
| 0, 1 | U1, U2 | U1, U2 | ✅ 正确 |
| 2 | S1 | U3 | ⚠️ 跳错行（仍滚动，看似正常） |
| 3 | U3 | U4 | ⚠️ 跳错行 |
| 4 | S2 | `undefined` | ❌ `jumpTo` 静默 `return`，点击无反应 |
| 5 | U4 | `undefined` | ❌ 同上 |

`jumpTo`（`src/client/index.ts`）首行 `if (target === undefined) return` —— 死寂无报错，与 §3 的「零报错失明」同款。

`detectCurrent` 同源：二分建立在 `rowCacheRef.tops`（同样只有 4 行）上，滚到底时命中缓存里最后一行（U4，index 3）→ 高亮圆点 #3 = **倒数第三**。这正是「拉到底定位不动」的直接解释。

此前观察到的「往上翻有效、往下无效」也由此解释：当前位较高的点击落在映射前缀（恰好正确），向下的点击落入错位区/死区。

### 6.4 附带对齐：surfaceOp 过滤

宿主节点分类还要求 `isAppendSurfaceEvent(event)`（`packages/core/session/src/surface.ts` L51-55：
`event.surfaceOp === 'append'`）。replace 类表面事件（重写/压缩检查点）**不会新增 DOM 行**，
若计入圆点会复制同一类错位。修复中圆点采集器同步加了
`surfaceOp !== undefined && surfaceOp !== 'append'` 过滤（`undefined` 容忍旧宿主不带标记的情况）。

备注：未入场的 pending steering（inbox 投影，`MessageItem.tsx` 的 `data-pending-steering` 气泡）
既无 `data-chat-anchor-key` 也无已落账事件 → 不产生圆点，无错位风险，无需处理。

### 6.5 修复内容（已实施，`pnpm build` 通过）

| 位置 | 改动 |
|---|---|
| `src/client/index.ts` `userRows()` | 过滤条件 `kind === 'user'` → `kind === 'user' \|\| kind === 'steering'`，与宿主「两类同视」对齐 |
| `src/client/index.ts` 圆点采集器 | 增加 `surfaceOp` append 过滤（§6.4） |

修复后圆点数 = DOM 用户行数（含 steering），事件序与 DOM 序同为 log seq 序，索引一一对应；
`detectCurrent` 的 tops 也随之补齐，滚动到底时高亮正确落在最后一个圆点。

### 6.6 验证步骤

1. 硬刷新（Ctrl+Shift+R），打开一个**末尾含插队消息**（agent 运行中发过消息）的会话
2. 点击最后两个圆点 → 应跳到对应的 steering 气泡
3. 滚动条拉到底 → 当前轮高亮应停在最后一个圆点
4. 无插队消息的旧会话回归：圆点/跳转/高亮行为不变

---

## 7. 系统性修复（2026-09-11）：DOM 单一事实源

> §6 的点位修复只堵了 steering 一个洞。本节记录消除「双源错位」类问题结构成因的重构。

### 7.1 类问题定义

消息轨曾维护两套平行数据——事件流生成的圆点（身份/数量/摘要）与 DOM 查询的行（几何/跳转/当前轮）——靠「数量恰好相等」的隐含假设维系。宿主任何渲染差异（steering、surfaceOp replace、未来新节点类型）都会在缝上爆出错位，且失效全是静默的（`undefined` return、二分钳制、`count===0` 返回 null）。

### 7.2 方案与实施结果

| 改动 | 内容 | 位置（src/client/index.ts） |
|---|---|---|
| 模块级共享 helper | `railRows()`（DOM 侧：user+steering 同视）、`collectUserEvents()`（事件侧：append+source 过滤）、`fallbackSummary()`（innerText 回退） | ~L849-890 |
| DOM 单一事实源 | 组件内 `users` → `turns`：身份/数量/顺序来自 `railRows()`，事件流仅在数量相等时按序配对补充摘要/时间，不等时回退行内文本自愈——「圆点无对应行」构造上不可能 | 组件渲染期 ~L1722-1729 |
| jumpTo 元素即身份 | 直接 `turns[index].el`，不再依赖位置对齐数组 | ~L1742 |
| 事件流订阅降级 | 保留为「触发器 + 增强数据源」，不再作为事实源（触发拓扑零改动） | effect ~L1679-1682 |
| 诊断口径统一 | `snapshotUserTurns` / `detectIssues` / `buildReport` 全部改调共享 helper，消除 steering 会话「快照/DOM 轮数不一致」误报 | ~L1084-1109 |
| measurePos gutter 修正 | 参照候选 = 输入框卡片 + 首个/末个会话行，取最贴目标侧边缘者（本修复只改左缘；左右镜像的右缘分支在另一 PR 上） | ~L1437-1453 |
| 滚动几何漂移自检 | onScroll rAF 内比较 `scrollHeight` 与缓存，漂移即重建行缓存（图片/代码块懒加载自愈） | ~L1699-1711 |

**关键取舍**（详见 findings.md）：不采用 anchor-key 身份关联——`data-chat-anchor-key` 由引擎内部公式 `conversationContextKey(kind,id)` 生成（`${kind.length}:${kind}${id}`），属 engine-owned 不稳定面，硬编码会引入新的静默失效。

### 7.3 状态

- `pnpm typecheck` + `pnpm build` ✅ 通过
- 浏览器端 Must Pass 验证：待硬刷新后按本 PR 的验证清单逐项执行
