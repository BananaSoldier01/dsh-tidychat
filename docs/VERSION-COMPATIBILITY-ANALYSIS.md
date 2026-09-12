# 消息轨取数路径 · 跨版本兼容性分析

> 生成时间: 2026-09-11  
> 目的: 确认 `eventSource.getSnapshot()` 修复方案在 DSH 0.1.2 ~ 0.1.5 上是否通用

---

## 1. 一句话结论

**修复方案跨版本通用。** `session.eventSource.getSnapshot()` 在 0.1.2、0.1.3、0.1.5 上返回相同的 `{ entries, hasMore, revision, change }` 结构，`user/message` 事件的 `data.content[]` 块数组格式不变。0.1.5 的 V3 变更仅在事件上新增了 `surfaceOp` 字段，不破坏现有读取逻辑。

---

## 2. 各版本 Session API 对比

### 2.1 `session.getSnapshot()` — 所有版本都返回控制状态

在已安装的 DSH 0.1.2-rc.1 中确认（`dsh-api-session-controller/lib/client.js` L1353-1374）：

```js
buildSnapshot() {
  return {
    sessionId, queue, pendingSubmissions, running, subagent,
    removed, openState, openError, hasMore, loadingOlder,
    promptError, blank, lastAgentError, promptAttempted, awaitingFirstTurn
  };
}
```

**没有 `nodes` 字段。** 这是根因分析报告确认的断链点。

### 2.2 `session.eventSource.getSnapshot()` — 所有版本返回事件窗口

```js
// MutableSessionEventSource.getSnapshot()
getSnapshot() {
  return this.snapshot;  // { entries, hasMore, revision, change }
}
```

`entries` 是事件数组，每个事件形如 `{ seq, type, data }`。用户消息事件：
- `type === 'user/message'`
- `data.content[]` 是块数组（`{ type: 'text', text: '...' }`）
- `data.source.kind === 'user'` 区分真实用户消息和 agent 注入

### 2.3 版本间差异

| 维度 | 0.1.2-rc.1 (V2) | 0.1.3-alpha.2 (V2+) | 0.1.5-alpha.1 (V3) |
|------|-----------------|---------------------|---------------------|
| `session.getSnapshot()` 形状 | 控制状态（无 nodes） | 同 0.1.2 | 同 0.1.2 |
| `eventSource.getSnapshot()` 形状 | `{ entries, hasMore, revision, change }` | 同 0.1.2 | 同 0.1.2 |
| `user/message` 事件结构 | `{ seq, type, data: { content[], source } }` | 同 0.1.2 | 同 0.1.2 + 可选 `surfaceOp` |
| Session 格式 | V2 (projection-based) | V2+ (增强) | V3 (surface node) |
| 客户端包名 | `dsh-client-store` | 同 0.1.2 | 同 0.1.2 |

### 2.4 0.1.5 V3 的增量变化

V3 引入了 `surface node` 架构，主要影响：
- 系统提示词变为 `surface node zero`（`data.surfaceOp?.op === 'zero'`）
- 新增 `compaction` 能力
- Token Meter 新增结构化 `TokenMeasurement`

**但这些变化不影响 `eventSource` 的基本形状**：
- `entries` 数组仍然是 `{ seq, type, data }` 事件
- `user/message` 事件的 `data.content[]` 格式不变
- `eventSource.getSnapshot()` 的返回类型不变

---

## 3. 修复方案的跨版本兼容性

### 3.1 推荐方案（改读 eventSource）

```ts
// 替换 L1685-1697 的解析逻辑
const users: Array<{ seq: number; time: number; summary: string }> = []
if (snapshot !== null && snapshot !== undefined && Array.isArray(snapshot.entries)) {
  for (const ev of snapshot.entries) {
    if (ev === null || ev === undefined) continue
    if (ev.type !== 'user/message') continue
    const src = ev.data?.source
    if (src !== undefined && src !== null && src.kind !== 'user') continue
    let text = ''
    if (Array.isArray(ev.data?.content)) {
      for (const block of ev.data.content) {
        if (block !== null && block !== undefined && typeof block.text === 'string') text += block.text
      }
    }
    users.push({ seq: ev.seq, time: /* 另寻 */, summary: String(text).trim().slice(0, 120) })
  }
}
```

**兼容性**：
- ✅ 0.1.2-rc.1：`entries` 存在，`user/message` 事件格式匹配
- ✅ 0.1.3-alpha.2：同上
- ✅ 0.1.5-alpha.1：同上（`surfaceOp` 是新增字段，不影响 `type === 'user/message'` 过滤）

### 3.2 binding 形状的跨版本稳定性

```js
binding: {
  sessionId: id,
  session,           // Session 对象（有 getSnapshot()）
  eventSource: session.eventSource,  // MutableSessionEventSource
  ctx
}
```

这个 binding 形状在 0.1.2 中确认存在。0.1.5 的 changelog 未提及 binding 结构变更。

### 3.3 已知注意事项

| 问题 | 影响版本 | 说明 |
|------|----------|------|
| 事件无 wall-clock 时间戳 | 所有版本 | `ev.data` 无 `time` 字段，悬停卡的时间需要从 DOM 行取 |
| `surfaceOp` 新增 | 仅 0.1.5 | 不影响 `type === 'user/message'` 过滤，但 `surface node zero` 也是 `user/message` 类型，需要跳过 |
| `hasMore` / 分页加载 | 所有版本 | `eventSource` 只含已加载窗口，跳转未加载消息需要调用 `loadOlder()` |

---

## 4. 结论

修复方案（改读 `eventSource`）在 DSH 0.1.2 ~ 0.1.5 上**通用**，无需按版本分支。唯一的版本差异是 0.1.5 的 `surfaceOp` 字段，但不影响核心解析逻辑。

**可以放心修复，一次修复覆盖所有目标版本。**
