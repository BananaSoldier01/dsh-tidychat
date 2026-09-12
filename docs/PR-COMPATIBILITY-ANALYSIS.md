# PR 与 v0.2.6 / v0.2.7 兼容性分析报告

> 分析时间：基于 `E:\test\rewrite-agently\mine-dsh-plugins\dsh-tidychat` 的三个 PR 分支
> 基准：upstream/main = v0.2.7 (ea43d88)

---

## ⚠️ 订正说明（2026-09-11 补，基准已推进到 v0.2.9 / 分支 a7699c1）

本报告写于 v0.2.7 时期，其中两条结论**已过时**，后续开发者请以下面的订正为准：

| 原结论 | 现状 | 依据 |
|---|---|---|
| 「三个 PR 的 settings 注册 API **不兼容**（阻断性），需 rebase + 改 API」 | **已解决** | `f424c03 Merge remote-tracking branch 'upstream/main' into feat/rail-mirror-and-dots'` 已把主线并入 feature 分支；当前 `src/index.ts` 是 `ctx.inject(['settings'], …)` + `installSection`/`register` 双回退写法，`TIDYCHAT_SETTINGS_NAMESPACE = 'tidychat' as const`，与 v0.2.9 一致 |
| 「`navigator` / `autoLoad` 默认值需从 `true` 改回 `false`」 | **不再适用** | v0.2.10 引入「接管官方消息轨」开关（`hideOfficialNav`，默认 **关**），消息轨在 DSH 0.1.2+ 可由用户自行接管，无需再靠默认关来回避与官方轨的冲突。分支现状保留 `navigator: true` / `autoLoad: true` |
| 「方案 C：功能已被上游包含，无需重新提交 PR」 | **不成立** | 已核实 `feat/rail-mirror-and-dots` 相对 `upstream/main` 领先 5 个提交（`ab1cf5e`/`263e363`/`f2ac9de`/`f424c03`/`a7699c1`），镜像与圆点**未**被上游主线吸收。这也是仓库保留 `shadow/main` 备用主线的原因 |

**另一条不在本报告内、但同样需要订正的旧结论**：README / HANDOVER 曾写「定位条依赖 `react-dom`」，据此在 DSH 0.1.2+ 暂停消息轨。已核实**不成立** —— `git grep react-dom` 在源码零命中，构建产物唯一的 `require()` 实参是 `react`，定位条只用 `useState`/`useRef`/`useEffect`/`createElement`。该说法源自 v0.2.6 之前就已删除的一套临时 DOM 实现。详见 `findings.md` D4 与 `HANDOVER.md` §4 原则 7。

---

## 总览

| PR 分支 | 唯一提交数 | 与 v0.2.6/0.2.7 关系 | 合并难度 |
|---|---|---|---|
| **feat/current-turn-accent** | 1 (dd70a51) | 功能无冲突，但 **settings API 不兼容** | 低 — rebase + 改 API |
| **feat/rail-mirror-and-dots** | 3 (ab1cf5e, 263e363, f2ac9de) | 功能无冲突，但 **settings API 不兼容** | 低 — rebase + 改 API |
| **fix/nav-tip-text-override** | 1 (de210b9) | 功能无冲突，但 **settings API 不兼容** | 极低 — 纯 CSS/JS 修复，改动小 |

---

## 一、所有 PR 共通的冲突项

### 冲突 1：settings 注册 API（**阻断性**）

> ✅ **已解决（见顶部订正说明）** —— `f424c03` 合并 `upstream/main` 后，分支已使用下面的「v0.2.7 要求」写法。本节保留仅作历史记录，**不要据此再改代码**。

**PR 代码（旧写法）**：

```typescript
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'

export const TIDYCHAT_SETTINGS_NAMESPACE = settingsNamespace('tidychat')

export function apply(ctx: any, config?: Config): void {
  installSettingsSection(ctx, TIDYCHAT_SETTINGS_NAMESPACE, Config, config ?? {}, {
    setSource: () => {},
    onChange: () => {},
  })
}
```

**v0.2.7 要求（新写法）**：

```typescript
import type { Context } from '@deepseek-ai/cordis'

export const TIDYCHAT_SETTINGS_NAMESPACE = 'tidychat' as const

export function apply(ctx: Context, config?: Config): void {
  ctx.inject(['settings'], (settingsCtx: any) => {
    const settings = settingsCtx.settings
    if (typeof settings?.installSection === 'function') {
      settings.installSection(ctx, TIDYCHAT_SETTINGS_NAMESPACE, Config, config ?? {}, {
        setSource: () => {},
        onChange: () => {},
      })
    } else if (typeof settings?.register === 'function') {
      settings.register(TIDYCHAT_SETTINGS_NAMESPACE, Config, { base: config ?? {} })
    }
  })
}
```

**影响**：
- 在 DSH 0.1.2+ 上 **无法加载**（`installSettingsSection` 不存在 → 模块加载失败）
- 需要替换整个 `src/index.ts` 的 apply 函数和命名空间定义

### 冲突 2：默认值（**需对齐**）

> ⚠️ **已失效（见顶部订正说明）** —— v0.2.10 起由 `hideOfficialNav`（默认关）让用户自行选择是否接管官方轨，不再需要把默认值改回 `false`。

| 配置项 | PR 默认值 | v0.2.6+ 默认值 | 冲突影响 |
|---|---|---|---|
| `navigator` | `true` | `false` | 与官方 TurnNavigator 冲突 |
| `autoLoad` | `true` | `false` | 与原生加载机制冲突 |

**建议**：PR 代码中的 `navigator: z.boolean().default(true)` 和 `autoLoad: z.boolean().default(true)` 需要改为 `false`。

### 冲突 3：命名空间注册方式

| | PR 代码 | v0.2.7 |
|---|---|---|
| `TIDYCHAT_SETTINGS_NAMESPACE` | `settingsNamespace('tidychat')` | `'tidychat' as const` |

---

## 二、各 PR 逐一分析

### PR #1：feat/current-turn-accent（1 commit）

**功能**：添加 `highlightCurrent` 开关，控制当前轮/悬停回合是否使用强调色高亮。

**代码差异（`src/client/index.ts` 中的关键改动）**：

```typescript
// 旧：始终高亮
const color = isCurrent || isHover ? hotColor : barColor

// PR 新：可开关
const color = (isCurrent || isHover) && config.highlightCurrent ? hotColor : barColor
```

**与 v0.2.6/0.2.7 的兼容性**：

| 方面 | 状态 | 说明 |
|---|---|---|
| 折叠逻辑 | ⚠️ **需更新** | PR 使用旧折叠逻辑（基于 anchor-key 正则解析），v0.2.6 重做了 TurnGroup 结构。rebase 后需同步折叠逻辑。 |
| 分隔线 | ⚠️ **需更新** | PR 使用动态 DOM 插入，v0.2.6 改为 CSS 伪元素。 |
| highlightCurrent | ✅ **可合并** | 这个功能与 v0.2.6/0.2.7 的新折叠逻辑无冲突，直接加到 `config` 和 canvas 绘制处即可。 |
| settings API | ❌ **需改写** | 见上文冲突 1。 |
| 默认值 | ⚠️ **需对齐** | `navigator: true`、`autoLoad: true` 改为 `false`。 |
| 颜色系统 | ✅ **兼容** | PR 使用硬编码 `hotColor`，v0.2.7 使用 `navColor`/`navAccent`。两者可以共存（highlightCurrent 只影响 hotColor 的使用时机）。 |

**合并步骤**：
1. 基于 `upstream/main` (v0.2.7) 创建新分支
2. 将 `highlightCurrent` 逻辑应用到新版本的 `src/client/index.ts`
3. 使用 v0.2.7 的 settings API 重写 `src/index.ts`
4. 对齐默认值

---

### PR #2：feat/rail-mirror-and-dots（3 commits）

**功能**：
1. 左/右镜像贴边（`navSide: 'left' \| 'right'`）— 定位条可贴会话区右缘
2. 圆点显示模式（`navStyle: 'bar' \| 'dot'`）— 圆点替代竖条
3. 摘要卡/提示文字文案保留

**与 v0.2.6/0.2.7 的兼容性**：

| 方面 | 状态 | 说明 |
|---|---|---|
| 折叠逻辑 | ⚠️ **需更新** | 同上，PR 使用旧折叠。 |
| 分隔线 | ⚠️ **需更新** | 同上。 |
| navSide/navStyle | ✅ **可合并** | 这两个配置项 v0.2.6/v0.2.7 已经支持。PR 的代码逻辑与上游基本一致。 |
| settings API | ❌ **需改写** | 见上文冲突 1。 |
| 默认值 | ⚠️ **需对齐** | `navigator: true`、`autoLoad: true` 改为 `false`。 |
| 配色系统 | ✅ **兼容** | PR 的 `NAV_HUE_PALETTE` + `resolveNavColors` 与 v0.2.7 结构一致。 |

**合并步骤**：
1. 基于 `upstream/main` (v0.2.7) 创建新分支
2. `src/index.ts` — 使用 v0.2.7 的 settings API + 加上 `navSide`/`navStyle` 配置项
3. `src/client/index.ts` — 使用 v0.2.7 的折叠/分隔线逻辑 + 加上 `navSide`/`navStyle` 的 UI 和绘制逻辑
4. 对齐默认值

> **注意**：这个 PR 的 3 个 commit 在功能上已被上游的 `release/local-merge` 分支包含，且代码已与上游一致。只需确保 fork 的 main 同步 upstream 即可。

---

### PR #3：fix/nav-tip-text-override（1 commit）

**功能**：修复悬停摘要泡泡文字色被主题覆盖的问题。

**具体修复**：
1. CSS 类名双写 + `!important`：`.tidychat-nav-tip.tidychat-nav-tip`（解决主题大范围 `color:inherit` 覆盖）
2. `applyTipContrast` 从 `document.body` 读 computed token（而非 `:root`，因为主题 token 定义在 body 作用域）

**与 v0.2.6/0.2.7 的兼容性**：

| 方面 | 状态 | 说明 |
|---|---|---|
| 折叠逻辑 | ✅ **无影响** | 此 PR 不修改折叠逻辑。 |
| CSS 类名修复 | ✅ **可直接合并** | 双类名 + `!important` 策略与 v0.2.7 的 CSS 兼容。 |
| body token 读取 | ✅ **可直接合并** | `applyTipContrast` 中从 `document.body` 读取与 v0.2.7 一致。 |
| settings API | ❌ **需改写** | 见上文冲突 1。 |
| 默认值 | ⚠️ **需对齐** | `navigator`/`autoLoad` 默认值。 |

**合并步骤**：
1. 基于 `upstream/main` (v0.2.7) 创建新分支
2. `src/index.ts` — 使用 v0.2.7 的 settings API
3. `src/client/index.ts` — 复制 v0.2.7 的完整代码，然后追加两处修复：
   - CSS 中 `.tidychat-nav-tip` → `.tidychat-nav-tip.tidychat-nav-tip`
   - `getComputedStyle(document.documentElement)` → `getComputedStyle(document.body)`

---

## 三、推荐行动方案

### 方案 A：基于 v0.2.7 重新提交 PR（推荐）

对每个 PR 分支执行以下步骤：

```bash
# 1. 从 v0.2.7 创建新分支
git checkout -B "rebased-<feature-name>" upstream/main

# 2. 应用该 PR 的功能改动
#    用 git show 提取功能差异，或直接编辑文件

# 3. 确保 src/index.ts 使用 v0.2.7 的 settings API
# 4. 确保 Config 中 navigator/autoLoad 默认为 false
# 5. 确保 TIDYCHAT_SETTINGS_NAMESPACE = 'tidychat' as const

# 6. 提交并推送
git commit -m "feat: <feature-name> (rebased on v0.2.7)"
git push origin rebased-<feature-name>
```

### 方案 B：直接 rebase（快速但有冲突）

```bash
git checkout origin/feat/current-turn-accent
git rebase upstream/main
# 处理冲突：用 v0.2.7 的 src/index.ts + PR 的 highlightCurrent 功能
git push origin feat/current-turn-accent --force-with-lease
```

### 方案 C：功能已被上游包含 — 无需重新提交 PR

> ❌ **不成立（见顶部订正说明）** —— 已核实 `feat/rail-mirror-and-dots` 相对 `upstream/main` 领先 5 个提交，镜像/圆点**未**被上游吸收。

PR #2（rail-mirror-and-dots）和 PR #3（nav-tip-text-override）的功能已存在于上游的 `release/local-merge` 合并结果中。如果这些功能已通过其他方式合入 upstream/main，则 fork 的 `origin/main` 只需同步 upstream 即可，无需重新提交 PR。

---

## 四、验证清单

在每个 PR 合并前逐项检查：

- [ ] `src/index.ts` 使用 `ctx.inject(['settings'], ...)` + `installSection`/`register` 双回退
- [ ] `src/index.ts` 命名空间 = `'tidychat' as const`，不经过 `settingsNamespace()`
- [ ] `Config` 中 `navigator: false`、`autoLoad: false`（与 0.1.2+ 原生功能不冲突）
- [ ] 折叠逻辑使用 v0.2.6+ 的 `TurnGroup` 结构（不是旧的正则解析）
- [ ] 分隔线使用 CSS 伪元素（不是动态 DOM 插入）
- [ ] CSS 变量全部使用 `--dsw-alias-*` 语义 token
- [ ] 在 DSH 0.1.1-rc.x 和 0.1.2-rc.1 上各验证一次
