/**
 * dsh-tidychat browser half: conversation timeline enhancement.
 *
 * - 已完成轮次自动折叠：隐藏思考 / 工具调用 / 中间文字，只保留最终总结，控制条常驻轮次顶部（含处理时长）。
 * - 分隔线：思考行与文字之间的实线 + 控制条自身的分隔线。
 * - 导航条：Codex 式左缘细窄条状定位，悬停弹摘要 + 附近条幅联动变长，点击跳转。
 * - 自动加载：发现「加载更早」按钮时自动点击，把全部历史纳入折叠与导航。
 *
 * 四个功能分别由设置命名空间 `tidychat` 的开关控制（fold / divider / navigator / autoLoad），
 * 通过 settingsScope 读取并在设置面板改动时即时生效。
 *
 * 全部副作用都在 apply 内通过 ctx.effect 登记，plugin 停止 / 更新时自动清理。
 */

import * as React from 'react'

// 构建时由 tsdown define 注入插件版本（package.json version）
declare const __PLUGIN_VERSION__: string

export const inject = ['slots', 'sessions'] as const

const CSS = `
[data-tidychat-divider] {
  border-top: 1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.45));
  opacity: 0.55;
  margin: 10px 0 10px 22px;
  height: 0;
  overflow: hidden;
  color: transparent;
  user-select: none;
}
/* 行内分隔线（展开时）：用思考芯片的 ::after 画，React 重渲染不会清掉 CSS 伪元素。 */
[data-variant="think"][data-tidychat-divider-answer]::after {
  content: '';
  display: block;
  border-top: 1px solid var(--dsw-alias-border-l2, rgba(96,96,96,0.85));
  opacity: 0.95;
  margin: 8px 0 8px 22px;
  height: 0;
  overflow: hidden;
  color: transparent;
  user-select: none;
}
[data-tidychat-answer-divider] {
  border-top: 1px solid var(--dsw-alias-border-l2, rgba(96,96,96,0.85));
  opacity: 0.95;
  margin: 10px 8px;
  height: 0;
  overflow: hidden;
  color: transparent;
  user-select: none;
}
[data-tidychat-divider-block] {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 2px;
  margin: 10px 8px 8px 8px;
  cursor: pointer;
}
.tidychat-ctl-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tidychat-ctl-label {
  font-size: 14px;
  color: var(--dsw-alias-label-secondary, #666);
  white-space: nowrap;
  flex: none;
}
.tidychat-ctl-line {
  width: 100%;
  border-top: 1px solid var(--dsw-alias-border-l2, rgba(96,96,96,0.8));
  opacity: 0.9;
  margin-top: 2px;
}
.tidychat-ctl-btn {
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #666);
  border-radius: 4px;
  padding: 0 4px;
  flex: none;
  transition: transform .18s ease;
}
.tidychat-ctl-btn:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,0.1));
}
.tidychat-autoload-hint {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary, #999);
  margin-left: 8px;
  white-space: nowrap;
}
[data-tidychat-folded], [data-tidychat-folded-inline] {
  opacity: 0;
  height: 0 !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden;
  transition: opacity .18s ease, height .18s ease, margin .18s ease, padding .18s ease;
}
/* 接管官方右缘消息轨（DSH 0.1.2+ 原生 TurnNavigator）：仅当根元素带
   data-tidychat-hide-official-nav 时生效（由 applyOfficialNavTakeover 切换）。
   官方类名是 CSS Module 产物 <hash>_slot / <hash>_frame，hash 随构建变化，
   禁止硬编码；故用「局部名子串 + 结构 + 内联 style 变量」三重锚定：
     - [class*="_slot"]:has(> nav[class*="_frame"])  外层 sticky 容器（hash-0 时也命中）
     - [style*="--turn-natural-position"]            官方 itemPosition() 对每轮必写的内联变量
   隐藏而非卸载：官方组件仍挂载（React 重渲染会还原被删节点）。 */
html[data-tidychat-hide-official-nav] [class*="_slot"]:has(> nav[class*="_frame"]),
html[data-tidychat-hide-official-nav] nav[class*="_frame"]:has([style*="--turn-natural-position"]) {
  display: none !important;
}
.tidychat-nav-rail {
  position: fixed;
  z-index: 40;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 6px 2px;
}
.tidychat-nav-canvas {
  display: block;
  cursor: pointer;
  touch-action: none;
}
/* 双类名 + !important：泡泡挂载在顶栏 header 内，部分样式主题（如 maid-atelier 换肤）会写
   「header 内所有 nav/span/button/a/div」这类大范围 color:inherit 规则，优先级约 (0,3,2)，
   单类名声明 (0,1,0) 必败，导致文字继承主题顶栏的浅色、落在浅色泡泡上不可读。
   变量链保留：皮肤仍可通过 --tidychat-nav-tip-text / --tidychat-nav-tip-head 定制。 */
.tidychat-nav-tip.tidychat-nav-tip {
  position: fixed;
  z-index: 41;
  pointer-events: none;
  max-width: 300px;
  background: var(--dsw-alias-bg-layer-3, #fff);
  border: 1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.3));
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.16);
  padding: 6px 10px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--tidychat-nav-tip-text, var(--dsw-alias-label-primary, #222)) !important;
  overflow-wrap: anywhere; /* 摘要含长代码/长串时在框内折行，不撑破卡片 */
}
.tidychat-nav-tip-head {
  color: var(--tidychat-nav-tip-head, var(--dsw-alias-label-secondary, #666)) !important;
  font-size: 11px;
  margin-bottom: 2px;
}
.tidychat-card {
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-3);
  border-radius: 12px;
  list-style: none;
  transition: border-color .16s, background .16s;
}
.tidychat-card:hover {
  border-color: var(--dsw-alias-label-dimmed);
}
.tidychat-card-open {
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-label-dimmed);
}
.tidychat-card-header {
  appearance: none;
  width: 100%;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 12px;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  display: flex;
}
.tidychat-card-headtext {
  flex-direction: column;
  flex: 1;
  gap: 4px;
  min-width: 0;
  display: flex;
}
.tidychat-card-name {
  color: var(--dsw-alias-label-primary);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
}
.tidychat-card-desc {
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 1.5;
}
.tidychat-card-chevron {
  color: var(--dsw-alias-label-tertiary);
  flex: none;
  transition: transform .16s;
}
.tidychat-card-chevron-open {
  transform: rotate(180deg);
}
.tidychat-card-body {
  border-top: 1px solid var(--dsw-alias-border-l2);
  margin: 0 16px;
  padding: 4px 0 12px;
}
.tidychat-field {
  flex-direction: column;
  gap: 6px;
  padding: 12px 0;
  display: flex;
}
.tidychat-field + .tidychat-field {
  border-top: 1px solid var(--dsw-alias-border-l2);
}
.tidychat-field-head {
  align-items: center;
  gap: 8px;
  display: flex;
}
.tidychat-field-label {
  min-width: 0;
  color: var(--dsw-alias-label-primary);
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
}
.tidychat-group-head {
  appearance: none;
  background: none;
  border: none;
  width: 100%;
  cursor: pointer;
  padding: 14px 0 10px;
  gap: 8px;
  color: inherit;
  align-items: center;
  display: flex;
}
.tidychat-group-title {
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
}
.tidychat-group-note {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 1.5;
  flex: 1;
  min-width: 0;
}
.tidychat-group-body {
  border-top: 1px solid var(--dsw-alias-border-l2);
}
.tidychat-field-hint {
  color: var(--dsw-alias-label-tertiary);
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}
.tidychat-report-field {
  margin-top: 12px;
}
.tidychat-report-tags-label {
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, #666);
  margin-bottom: 6px;
}
.tidychat-report-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.tidychat-report-tag {
  font-size: 12px;
  cursor: pointer;
  border: 1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.4));
  background: transparent;
  color: var(--dsw-alias-label-secondary, #666);
  border-radius: 999px;
  padding: 3px 10px;
}
.tidychat-report-tag-on {
  background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,0.12));
  color: var(--dsw-alias-label-primary, #222);
  border-color: var(--dsw-alias-state-business-primary, #3b82f6);
}
.tidychat-report-btn {
  font-size: 13px;
  cursor: pointer;
  border: 1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.4));
  background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,0.08));
  color: var(--dsw-alias-label-primary, #222);
  border-radius: 8px;
  padding: 6px 14px;
}
.tidychat-report-btn:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,0.14));
}
.tidychat-color-sub {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}
.tidychat-color-sub-label {
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary, #999);
  flex: none;
  min-width: 30px;
}
.tidychat-color-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.tidychat-nav-color-chip {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.4));
  background: transparent;
  color: var(--dsw-alias-label-secondary, #666);
  border-radius: 999px;
  padding: 3px 10px;
}
.tidychat-nav-color-chip:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,0.1));
}
.tidychat-nav-color-chip-on {
  border-color: var(--dsw-alias-state-business-primary, #3b82f6);
  color: var(--dsw-alias-label-primary, #222);
  background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,0.12));
}
.tidychat-nav-color-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  border: 1px solid rgba(128,128,128,0.35);
  flex: none;
}
/* 调色盘：原生取色器（无极调色）+ HEX/RGB 文本 + 透明度滑杆 */
.tidychat-picker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.tidychat-color-input {
  appearance: none;
  width: 34px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.4));
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  flex: none;
}
.tidychat-color-input::-webkit-color-swatch-wrapper { padding: 2px; }
.tidychat-color-input::-webkit-color-swatch { border: none; border-radius: 4px; }
.tidychat-hex-input {
  appearance: none;
  flex: 1 1 140px;
  min-width: 110px;
  font-size: 12px;
  font-family: var(--ds-font-family-code, monospace);
  color: var(--dsw-alias-label-primary, #222);
  background: var(--dsw-alias-bg-layer-2, rgba(127,127,127,0.08));
  border: 1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.4));
  border-radius: 6px;
  padding: 4px 8px;
}
.tidychat-hex-input:focus {
  outline: 1.5px solid var(--dsw-alias-button-info-fill, #3b82f6);
  outline-offset: 1px;
}
.tidychat-alpha-input {
  appearance: none;
  flex: 1 1 90px;
  min-width: 80px;
  height: 4px;
  border-radius: 999px;
  background: var(--dsw-alias-border-l2, rgba(128,128,128,0.4));
  cursor: pointer;
}
.tidychat-alpha-input::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--dsw-alias-state-business-primary, #3b82f6);
  border: none;
}
.tidychat-alpha-label {
  font-size: 12px;
  color: var(--dsw-alias-label-tertiary, #999);
  min-width: 34px;
  text-align: right;
  flex: none;
}
.tidychat-switch {
  appearance: none;
  border: none;
  cursor: pointer;
  flex: none;
  width: 34px;
  height: 20px;
  border-radius: 999px;
  padding: 0;
  background: var(--dsw-alias-label-dimmed, rgba(127,127,127,0.4));
  position: relative;
  transition: background .16s;
}
.tidychat-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform .16s;
}
.tidychat-switch-on {
  background: var(--dsw-alias-brand-primary, #3b82f6);
}
.tidychat-switch-on::after {
  transform: translateX(14px);
}
.tidychat-switch:disabled {
  opacity: .5;
  cursor: default;
}
`

function injectStyle(css: string): () => void {
  const tag = document.createElement('style')
  tag.setAttribute('data-plugin-css', 'dsh-tidychat')
  tag.textContent = css
  document.head.appendChild(tag)
  return () => { tag.remove() }
}

const REPORT_TAGS: ReadonlyArray<string> = ['滚动卡顿', '输入卡顿', '界面卡顿', '定位条异常', '自动加载异常', '折叠异常']

// 定位条配色选择项（settings 卡片用）：色系 × 多级明度 正交组合。
// preview 用于色块预览；明度 l1=浅 / l2=中 / l3=深。
const NAV_HUE_OPTIONS: ReadonlyArray<{ key: string; label: string; preview: string }> = [
  { key: 'gray', label: '灰', preview: '#9e9e9e' },
  { key: 'black', label: '黑', preview: '#111111' },
  { key: 'white', label: '白', preview: '#f5f5f5' },
  { key: 'blue', label: '蓝', preview: '#3b82f6' },
  { key: 'violet', label: '紫', preview: '#8b5cf6' },
  { key: 'cyan', label: '青', preview: '#06b6d4' },
  { key: 'green', label: '绿', preview: '#22c55e' },
  { key: 'orange', label: '橙', preview: '#f97316' },
  { key: 'red', label: '红', preview: '#ef4444' },
]
const NAV_LIGHT_OPTIONS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'l1', label: '极浅' },
  { key: 'l2', label: '浅' },
  { key: 'l3', label: '中' },
  { key: 'l4', label: '深' },
  { key: 'l5', label: '极深' },
]
const NAV_SIDE_OPTIONS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'left', label: '左缘' },
  { key: 'right', label: '右缘（镜像）' },
]
const NAV_STYLE_OPTIONS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'bar', label: '横线' },
  { key: 'dot', label: '圆点' },
]
const NAV_RING_OPTIONS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'off', label: '关' },
  { key: 'on', label: '开' },
]

export function apply(ctx: any): void {
  ctx.effect(() => injectStyle(CSS))

  const listeners: Array<() => void> = []
  const notify = () => { for (const fn of listeners) fn() }
  const foldState = new Map<string, Map<number, boolean>>()

  // ===== Smart AutoLoad Governor（内部性能预算为时间，非行数/次数，跨机器自洽）=====
  const SOFT_BUDGET_MS = 30
  const HARD_BUDGET_MS = 50
  const CONSECUTIVE_SLOW_LIMIT = 3
  const SETTLE_QUIET_MS = 300
  const SETTLE_TIMEOUT_MS = 8000
  const IDLE_FALLBACK_MS = 50
  const NULL_RETRY_LIMIT = 15
  const NULL_RETRY_DELAY_MS = 2000

  type GovernorStatus = 'idle' | 'loading' | 'settling' | 'paused' | 'done'

  interface AutoLoadState {
    generation: number
    status: GovernorStatus
    consecutiveSlow: number
    nullStreak: number
  }
  const governor = new Map<string, AutoLoadState>()
  let activeSessionId: string | null = null
  // 折叠状态按会话隔离（同一轮次数在不同会话互不继承），避免跨会话串扰
  const foldScope = (): string => activeSessionId ?? '_global'
  const foldGet = (turn: number): boolean => foldState.get(foldScope())?.get(turn) ?? true
  const foldSet = (turn: number, folded: boolean): void => {
    const scope = foldScope()
    let inner = foldState.get(scope)
    if (inner === undefined) {
      inner = new Map<number, boolean>()
      foldState.set(scope, inner)
    }
    inner.set(turn, folded)
  }

  // batch 是否进行中：从「当前活跃会话」的 status 派生（旧会话的异步回调永远无法影响新会话）
  const isGovernorBusy = (): boolean => {
    if (activeSessionId === null) return false
    const st = governor.get(activeSessionId)
    return st !== undefined && (st.status === 'loading' || st.status === 'settling')
  }

  // 可观测性 / 无效扫描：扫描耗时 + dirty 标记（5 秒兜底发现无变化时跳过全量扫描）
  let lastScanMs = 0
  let peakScanMs = 0
  let scanCount = 0
  let dirty = false

  // 生命周期清理登记：一次性 timer/订阅在 ctx.effect 里统一清理；
  // generation 守卫保留作第二道防线（cleanup 拦不住已进入事件队列的 callback）。
  const disposers: Array<() => void> = []
  ctx.effect(() => () => {
    for (const d of disposers.splice(0)) { try { d() } catch { /* ignore */ } }
  })
  /** 登记一次性资源；资源自然结束时调用返回的 off() 摘除，避免登记表无限增长。 */
  const track = (dispose: () => void): (() => void) => {
    disposers.push(dispose)
    return () => {
      const i = disposers.indexOf(dispose)
      if (i >= 0) disposers.splice(i, 1)
    }
  }

  // 设置：tidychat 命名空间，四个开关 + 定位条配色（默认色 auto 尊重主题 + 强调色 auto 跟随主题品牌色）；读不到 settings 服务时全开。
  const config = { fold: true, divider: true, navigator: true, hideOfficialNav: false, autoLoad: true, navColor: 'auto', navColorCustom: '', navColorLight: 'l3', navAccent: 'auto', navAccentCustom: '', navAccentLight: 'l3', navSide: 'left', navStyle: 'bar', navRing: false }
  let settingsScope: any = null
  const settingsFace = ctx.get('webUiSettings') ?? ctx.get('settingsScope')
  if (settingsFace !== undefined && typeof settingsFace.bind === 'function') {
    try { settingsScope = settingsFace.bind({ namespace: 'tidychat' }) } catch { settingsScope = null }
  }

  const cleanTiming = (raw: string): string => {
    if (typeof raw !== 'string' || raw === '') return ''
    const yongshi = raw.indexOf('用时')
    if (yongshi === -1) return ''
    const before = raw.slice(0, yongshi)
    const times = before.match(/\d{1,2}:\d{2}/g)
    const lead = times !== null && times.length > 0 ? times[times.length - 1] : ''
    const rest = raw.slice(yongshi)
    const tok = rest.indexOf('tok/s')
    const body = tok === -1 ? rest.slice(0, 50) : rest.slice(0, tok + 5)
    return (lead !== '' ? lead + ' · ' : '') + body
  }

  const hasTextInStep = (row: Element): boolean => {
    const think = row.querySelector('[data-variant="think"]')
    if (think === null) return true
    let sib: Element | null = think.nextElementSibling
    while (sib !== null && sib.hasAttribute && sib.hasAttribute('data-tidychat-divider')) {
      sib = sib.nextElementSibling
    }
    return sib !== null
  }

  const applySurgery = (): { inline: number; folded: number; hiddenContext: number } => {
    let inline = 0
    let foldedCount = 0
    let hiddenContext = 0
    const all = scopedRows('[data-chat-anchor-key]')

    // 0) 清理上一轮的折叠标记，再由本轮分类重新打（issue #12）。
    // 原因：applyFold 只遍历「本轮」的 whole/inline 列表。若某行从 whole 变成 inline/可见，
    // 旧标记不会被移除，该行会一直被 CSS 隐藏（opacity:0; height:0）直到刷新页面。
    // 先清后打都在同一个 JS 任务内完成，浏览器只在任务结束后绘制，因此不会闪烁；
    // 同时保证「关闭 fold 开关」后，先前被折叠的行会立即恢复显示。
    for (const el of scopedRows('[data-tidychat-folded]')) el.removeAttribute('data-tidychat-folded')
    for (const el of scopedRows('[data-tidychat-folded-inline]')) el.removeAttribute('data-tidychat-folded-inline')

    // 1) 行内思考↔文字分隔线（独立开关 divider）；折叠时统一由 applyFold 处理，避免与折叠态冲突。
    if (config.divider && !config.fold) {
      for (const row of all) {
        const anchor = row.getAttribute('data-chat-anchor-key') || ''
        if (anchor.indexOf('14:assistant-step') !== 0) continue
        if (row.querySelector('[data-tidychat-divider]') !== null) continue
        const think = row.querySelector('[data-variant="think"]')
        if (think === null || think.parentElement === null) continue
        let next: Element | null = think.nextElementSibling
        while (next !== null && next.hasAttribute && next.hasAttribute('data-tidychat-divider')) {
          next = next.nextElementSibling
        }
        if (next === null) continue
        const divider = document.createElement('div')
        divider.setAttribute('data-tidychat-divider', '1')
        divider.setAttribute('role', 'separator')
        divider.textContent = '\u00a0'
        think.parentElement.insertBefore(divider, next)
        inline += 1
      }
    }

    // 2) 折叠（独立开关 fold）：只折叠「思考 + 工具调用」，保留用户提问与真正的答复正文。
    if (config.fold) {
      interface TurnGroup { rows: Element[]; tail: Element | null; whole: Element[]; inline: Array<{ row: Element; think: Element }>; answerRow: Element | null }
      const byTurn = new Map<number, TurnGroup>()
      // 旧版 DSH（0.1.0-rc.7 ~ 0.1.1-rc.x）的聊天 DOM 没有 data-chat-turn（0.1.2+ 的 dsh-client-ui-chat 才输出）。
      // 这里做兼容回退：有 data-chat-turn 走新逻辑；没有则按 v0.2.5 的方式从 data-chat-anchor-key 解析 turn，
      // 并顺序沿用当前 turn（tool-call / turn-tail 等行没有 info），遇到 user 行重置为 null。
      let fallbackTurn: number | null = null
      const turnOf = (row: Element): number | null => {
        // 新 DOM（0.1.2+）：直接读 data-chat-turn。
        const t = row.getAttribute('data-chat-turn')
        if (t !== null) {
          const n = Number(t)
          return Number.isFinite(n) ? n : null
        }
        // 旧 DOM 回退：user 行开启新 turn；assistant-step 从 anchor 解析；其余行沿用当前 turn。
        const kind = row.getAttribute('data-chat-flow-kind') || ''
        if (kind === 'user') {
          fallbackTurn = null
          return null
        }
        const anchor = row.getAttribute('data-chat-anchor-key') || ''
        const m = /^14:assistant-step(\d+):/.exec(anchor)
        if (m !== null) {
          fallbackTurn = Number(m[1])
          return fallbackTurn
        }
        return fallbackTurn
      }
      // 判断某行里除了「思考/工具过程」之外是否还有真正的答复正文（文本不在 think / disclosure 内）。
      const hasAnswerOutsideThink = (row: Element, think: Element): boolean => {
        const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT)
        let node: Node | null
        while ((node = walker.nextNode()) !== null) {
          const txt = (node.textContent || '').replace(/\s+/g, '')
          if (txt === '') continue
          const el = node.parentElement
          if (el === null) continue
          if (el.closest('[data-variant="think"]') !== null) continue
          if (el.closest('[data-disclosure-row]') !== null) continue
          return true
        }
        return false
      }
      for (const row of all) {
        const turn = turnOf(row)
        if (turn === null) continue
        let g = byTurn.get(turn)
        if (g === undefined) { g = { rows: [], tail: null, whole: [], inline: [], answerRow: null }; byTurn.set(turn, g) }
        g.rows.push(row)
        const kind = row.getAttribute('data-chat-flow-kind') || ''
        if (kind === 'turn-tail') {
          g.tail = row
        } else if (kind === 'tool-call') {
          g.whole.push(row)
        } else if (kind === 'model-retry') {
          // DSH 把被重试的模型请求渲染为 data-chat-flow-kind="model-retry"（“已重试模型请求”状态行）。
          // 它属于过程噪音、无正式答复需要保留，随思考/工具调用一起折叠（issue #8）。
          g.whole.push(row)
        } else if (kind === 'assistant-step') {
          const think = row.querySelector('[data-variant="think"]')
          if (think !== null) {
            if (hasAnswerOutsideThink(row, think)) g.inline.push({ row, think })
            else g.whole.push(row)
          }
          // 无 think 的 assistant-step = 纯答复正文，保持可见，不进折叠列表。
        }
      }

      const coveredRows = new Set<Element>()
      for (const [turn, g] of byTurn) {
        if (g.tail === null) continue
        if (g.whole.length === 0 && g.inline.length === 0) continue
        // 控制条插在「第一条要被折叠的过程行」之前（即在用户提问之后、过程之上）。
        const firstProcess = g.rows.find((r) => g.whole.includes(r) || g.inline.some((x) => x.row === r))
        if (firstProcess === undefined || firstProcess.parentElement === null) continue
        for (const row of g.whole) coveredRows.add(row)

        // 分隔线位置：在「最后一条过程行」之后的第一个纯答复行（assistant-step 且不在 whole/inline 中）。
        let lastProcessIdx = -1
        for (let i = 0; i < g.rows.length; i++) {
          const r = g.rows[i]
          if (g.whole.includes(r) || g.inline.some((x) => x.row === r)) lastProcessIdx = i
        }
        let answerRow: Element | null = null
        for (let i = lastProcessIdx + 1; i < g.rows.length; i++) {
          const r = g.rows[i]
          const kind = r.getAttribute('data-chat-flow-kind') || ''
          if (kind === 'assistant-step' && !g.whole.includes(r) && !g.inline.some((x) => x.row === r)) { answerRow = r; break }
        }
        // 注意：若没有独立的纯答复行（正式回复内联在思考行里），不加块级分隔线，
        // 改由 applyFold 在每个内联行的“思考芯片 ↔ 回复正文”之间插入行内分隔线。

        let ctl: HTMLElement | null = null
        // 优先复用已存在的同回合控制条（按 data-tidychat-turn 找），避免 observer 重跑时不断重插。
        const parentEl = firstProcess.parentElement
        const existingCtl = parentEl.querySelector<HTMLElement>('[data-tidychat-divider-block][data-tidychat-turn="' + String(turn) + '"]')
        if (existingCtl !== null) {
          ctl = existingCtl
          if (existingCtl.nextElementSibling !== firstProcess) parentEl.insertBefore(existingCtl, firstProcess)
        } else {
          ctl = document.createElement('div')
          ctl.setAttribute('data-tidychat-divider-block', '1')
          ctl.setAttribute('data-tidychat-turn', String(turn))
          ctl.setAttribute('role', 'separator')
          const head = document.createElement('div')
          head.className = 'tidychat-ctl-head'
          const label = document.createElement('span')
          label.className = 'tidychat-ctl-label'
          const btn = document.createElement('button')
          btn.className = 'tidychat-ctl-btn'
          btn.setAttribute('type', 'button')
          // Codex 同款细描边 chevron（收起朝右、展开朝下，由 transform 旋转驱动）。
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          svg.setAttribute('width', '12')
          svg.setAttribute('height', '12')
          svg.setAttribute('viewBox', '0 0 12 12')
          svg.setAttribute('fill', 'none')
          const chevPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
          chevPath.setAttribute('d', 'M3 4.5 L6 7.5 L9 4.5')
          chevPath.setAttribute('stroke', 'currentColor')
          chevPath.setAttribute('stroke-width', '1.5')
          chevPath.setAttribute('stroke-linecap', 'round')
          chevPath.setAttribute('stroke-linejoin', 'round')
          svg.appendChild(chevPath)
          btn.appendChild(svg)
          head.appendChild(label)
          head.appendChild(btn)
          ctl.appendChild(head)
          const line = document.createElement('div')
          line.className = 'tidychat-ctl-line'
          ctl.appendChild(line)
          // Codex：整条「用时」区域可点击切换折叠/展开。
          ctl.addEventListener('click', () => {
            const cur = foldGet(turn)
            const timing = g.tail !== null ? cleanTiming(g.tail.textContent || '') : ''
            applyFold(turn, g.whole, g.inline, ctl, !cur, answerRow, timing)
          })
          firstProcess.parentElement!.insertBefore(ctl, firstProcess)
        }
        const folded = foldGet(turn)
        const timing = g.tail !== null ? cleanTiming(g.tail.textContent || '') : ''
        applyFold(turn, g.whole, g.inline, ctl, folded, answerRow, timing)
        if (folded) foldedCount += 1
      }

      // 未覆盖的上下文注入行强制隐藏（保持原行为）
      for (const row of all) {
        if (row.getAttribute('data-chat-flow-kind') !== 'context') continue
        if (coveredRows.has(row)) continue
        if (row.hasAttribute('data-tidychat-folded')) continue
        row.setAttribute('data-tidychat-folded', '1')
        hiddenContext += 1
      }
    }

    return { inline, folded: foldedCount, hiddenContext }
  }

  const applyFold = (turn: number, wholeRows: Element[], inlineRows: Array<{ row: Element; think: Element }>, ctl: HTMLElement | null, folded: boolean, answerRow: Element | null, timing: string): void => {
    foldSet(turn, folded)
    for (const row of wholeRows) {
      if (folded) row.setAttribute('data-tidychat-folded', '1')
      else row.removeAttribute('data-tidychat-folded')
    }
    for (const { think } of inlineRows) {
      if (folded) think.setAttribute('data-tidychat-folded-inline', '1')
      else think.removeAttribute('data-tidychat-folded-inline')
    }
    // 行内分隔线：展开时给「思考芯片」加 data-tidychat-divider-answer，用 CSS ::after 画线（React 重渲染不会清掉）；收起时移除。
    if (config.divider) {
      for (const { think } of inlineRows) {
        if (!folded) think.setAttribute('data-tidychat-divider-answer', '1')
        else think.removeAttribute('data-tidychat-divider-answer')
      }
    }
    // 「思考/代码」与「回复正文」之间的分隔线：**仅实际展开时显示**（收起时用时下方的线已够分隔，避免两条线叠在一起）。
    if (answerRow !== null && answerRow.parentElement !== null) {
      const prev = answerRow.previousElementSibling as HTMLElement | null
      const isOurs = (el: Element | null): boolean => el instanceof HTMLElement && el.hasAttribute('data-tidychat-answer-divider')
      if (!folded) {
        if (!isOurs(prev)) {
          const boundary = document.createElement('div')
          boundary.setAttribute('data-tidychat-answer-divider', '1')
          boundary.setAttribute('role', 'separator')
          answerRow.parentElement.insertBefore(boundary, answerRow)
        }
      } else if (isOurs(prev)) {
        (prev as HTMLElement).remove()
      }
    }
    if (ctl !== null) {
      const label = ctl.querySelector('.tidychat-ctl-label')
      const btn = ctl.querySelector<HTMLElement>('.tidychat-ctl-btn')
      const totalSteps = wholeRows.length + inlineRows.length
      // Codex 式：优先显示「用时 X」；箭头固定 ▾，折叠时旋转 -90°（朝右）、展开时 0°（朝下），带过渡。
      const labelText = timing !== '' ? timing : (folded ? ('过程 ' + totalSteps + ' 步') : ('已展开 ' + totalSteps + ' 步'))
      // 只在文案真正变化时才写入，避免相同 textContent 反复触发 DOM mutation
      if (label !== null && label.textContent !== labelText) label.textContent = labelText
      if (btn !== null) {
        // 只驱动 SVG chevron 的旋转：折叠 -90°（朝右）、展开 0°（朝下）。
        const rot = folded ? 'rotate(-90deg)' : 'rotate(0deg)'
        if (btn.style.transform !== rot) btn.style.transform = rot
      }
    }
  }

  const findScrollContainer = (): Element | null => document.querySelector('[data-conversation-scroll]')

  // DOM 查询统一收口到会话容器：容器存在只看容器，未挂载才回退 document（防 hero/空会话态失效）。
  const scopedRows = (selector: string): Element[] => {
    const container = findScrollContainer()
    return Array.from((container ?? document).querySelectorAll<Element>(selector))
  }

  // ===== 消息轨共享采集 helper（主链路与诊断报告共用，保证口径一致）=====

  // DOM 侧用户行：'user'（开新回合）+ 'steering'（运行中插队，宿主渲染为独立 kind）二者同视。
  // 漏掉 steering 会让「圆点数 > DOM 行数」→ 尾部圆点映射到不存在的行（RAIL-ROOT-CAUSE-ANALYSIS §6 根因）。
  const railRows = (): Element[] => scopedRows('[data-chat-anchor-key]').filter((r) => {
    const k = r.getAttribute('data-chat-flow-kind')
    return k === 'user' || k === 'steering'
  })

  // 事件侧用户轮：user/message + source.kind === 'user'，且只统计 append 表面事件
  //（对齐宿主 isAppendSurfaceEvent：replace/重写事件不会新增 DOM 行，计入会造成圆点与行错位；
  // undefined 容忍旧宿主不带 surfaceOp 标记的情况）。
  const collectUserEvents = (snapshot: any): Array<{ seq: number; time: number; summary: string }> => {
    const out: Array<{ seq: number; time: number; summary: string }> = []
    if (snapshot === null || snapshot === undefined || !Array.isArray(snapshot.entries)) return out
    for (const entry of snapshot.entries) {
      if (entry === null || entry === undefined || entry.type !== 'event') continue
      const ev = entry.event
      if (ev === null || ev === undefined || ev.type !== 'user/message') continue
      const op = (ev as any).surfaceOp
      if (op !== undefined && op !== 'append') continue
      const src = ev.data?.source
      if (src !== undefined && src !== null && src.kind !== 'user') continue
      let text = ''
      if (Array.isArray(ev.data?.content)) {
        for (const block of ev.data.content) {
          if (block !== null && block !== undefined && typeof block.text === 'string') text += block.text
        }
      }
      out.push({ seq: ev.seq, time: ev.time, summary: String(text).trim().slice(0, 120) })
    }
    return out
  }

  // 摘要回退：行内隐藏文本（hover actions/时间）会被 textContent 带上，innerText 排除不可见内容；
  // 仅在缓存重建/渲染期调用（非滚动热路径），布局成本可接受。
  const fallbackSummary = (el: Element): string => {
    try {
      const t = (el as HTMLElement).innerText ?? ''
      return t.replace(/\s+/g, ' ').trim().slice(0, 120)
    } catch { return String(el.textContent ?? '').trim().slice(0, 120) }
  }

  const isLoadOlderButton = (b: Element): boolean => {
    const t = (b.textContent || '').trim()
    // 仅匹配会话专属文案；移除泛化的「加载更多 / Load more」，避免误点其它列表的同名按钮
    return t === '加载更早' || t === 'Load earlier' || t === 'Load older'
  }

  const findLoadOlderButton = (): HTMLButtonElement | null => {
    for (const b of scopedRows('button')) {
      if (isLoadOlderButton(b)) return b as HTMLButtonElement
    }
    return null
  }

  const countAnchors = (): number => scopedRows('[data-chat-anchor-key]').length

  // 单次「加载一页后」的受控测量：只测 applySurgery 的耗时（DOM 越大越贵），随后通知导航条刷新。
  const measuredScan = (): number => {
    const t0 = performance.now()
    try { applySurgery() } catch (err) { console.error('[dsh-tidychat] 扫描出错', err) }
    const ms = performance.now() - t0
    try { notify() } catch { /* ignore */ }
    return ms
  }

  const showPausedHint = (): void => {
    if (document.querySelector('[data-tidychat-autoload-hint]') !== null) return
    const btn = findLoadOlderButton()
    if (btn === null || btn.parentElement === null) return
    const hint = document.createElement('span')
    hint.setAttribute('data-tidychat-autoload-hint', '1')
    hint.className = 'tidychat-autoload-hint'
    hint.textContent = '为保持流畅，已暂停自动加载更早历史；可手动继续'
    btn.parentElement.insertBefore(hint, btn.nextSibling)
  }

  function pauseGovernor(st: AutoLoadState): void {
    st.status = 'paused'
    st.generation += 1
    showPausedHint()
  }

  function scheduleNext(sessionId: string): void {
    if (!config.autoLoad) return
    if (sessionId !== activeSessionId) return
    const st = governor.get(sessionId)
    if (st === undefined || st.status !== 'idle') return
    const gen = ++st.generation
    const run = (): void => {
      if (sessionId !== activeSessionId) return
      const cur = governor.get(sessionId)
      if (cur === undefined || cur.generation !== gen || cur.status !== 'idle') return
      loadOnePage(sessionId, gen)
    }
    let off: () => void = () => {}
    const w = window as any
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(() => { off(); run() }, { timeout: 2000 })
      off = track(() => w.cancelIdleCallback(id))
    } else {
      const id = setTimeout(() => { off(); run() }, IDLE_FALLBACK_MS)
      off = track(() => clearTimeout(id))
    }
  }

  function loadOnePage(sessionId: string, gen: number): void {
    if (!config.autoLoad) return
    if (sessionId !== activeSessionId) return
    const st = governor.get(sessionId)
    if (st === undefined || st.generation !== gen || st.status !== 'idle') return
    const btn = findLoadOlderButton()
    if (btn === null) {
      // 按钮尚未出现（会话仍在加载、hasMore 尚未确定）或确实无更早历史。
      // 有限重试后放弃，避免首次就误判 done 导致永不自动加载。
      if (st.nullStreak >= NULL_RETRY_LIMIT) { st.status = 'done'; return }
      st.nullStreak += 1
      st.status = 'idle'
      let off: () => void = () => {}
      const id = setTimeout(() => { off(); scheduleNext(sessionId) }, NULL_RETRY_DELAY_MS)
      off = track(() => clearTimeout(id))
      return
    }
    st.nullStreak = 0
    if (btn.disabled) {
      // 可能是暂时 loading/不可用，保持 idle 稍后重试，而非永久 done
      st.status = 'idle'
      let off: () => void = () => {}
      const id = setTimeout(() => { off(); scheduleNext(sessionId) }, NULL_RETRY_DELAY_MS)
      off = track(() => clearTimeout(id))
      return
    }
    st.status = 'loading'
    const before = countAnchors()
    // 先挂 settle observer + 超时，再点击，避免点击同步触发 DOM 变化时漏观察
    settleThenMeasure(sessionId, gen, before)
    try { btn.click() } catch { /* ignore */ }
  }

  function settleThenMeasure(sessionId: string, gen: number, before: number): void {
    // batch 进入 settle 阶段（busy 由 isGovernorBusy 从当前会话 status 派生）
    const st0 = governor.get(sessionId)
    if (st0 !== undefined) st0.status = 'settling'
    let quietTimer: ReturnType<typeof setTimeout> | null = null
    let settleTimeout: ReturnType<typeof setTimeout> | null = null
    let obs: MutationObserver | null = null
    let finished = false
    const finish = (isTimeout: boolean): void => {
      if (finished) return
      finished = true
      if (quietTimer !== null) clearTimeout(quietTimer)
      if (settleTimeout !== null) clearTimeout(settleTimeout)
      obs?.disconnect()
      if (sessionId !== activeSessionId) return
      const st = governor.get(sessionId)
      if (st === undefined || st.generation !== gen || st.status !== 'settling') return
      const after = countAnchors()
      const grew = after > before
      const stillHasButton = findLoadOlderButton() !== null
      // 每批只执行一次 surgery + 测量（普通 scan 在 batch 期间被抑制），
      // 测的才是这批历史真实带来的首次处理成本。
      const scanMs = measuredScan()
      // 超时 / 静默后无增长且按钮仍在 = 失败或空转，避免自动重试循环
      if (isTimeout || (!grew && stillHasButton)) { pauseGovernor(st); return }
      if (scanMs >= HARD_BUDGET_MS) { pauseGovernor(st); return }
      if (scanMs >= SOFT_BUDGET_MS) {
        st.consecutiveSlow += 1
        if (st.consecutiveSlow >= CONSECUTIVE_SLOW_LIMIT) { pauseGovernor(st); return }
      } else {
        st.consecutiveSlow = 0
      }
      // 本批确实加载了新内容且「加载更早」按钮已消失 = 已到历史最前端，干净收尾
      if (grew && !stillHasButton) { st.status = 'done'; return }
      st.status = 'idle'
      scheduleNext(sessionId)
    }
    const container = findScrollContainer()
    obs = new MutationObserver(() => {
      if (finished) return
      if (quietTimer !== null) clearTimeout(quietTimer)
      quietTimer = setTimeout(() => { finish(false) }, SETTLE_QUIET_MS)
    })
    obs.observe(container ?? document.body, { childList: true, subtree: true })
    settleTimeout = setTimeout(() => { finish(true) }, SETTLE_TIMEOUT_MS)
  }

  const scan = (): void => {
    const t0 = performance.now()
    try {
      applySurgery()
      notify()
    } catch (err) {
      console.error('[dsh-tidychat] 扫描出错', err)
    }
    lastScanMs = performance.now() - t0
    if (lastScanMs > peakScanMs) peakScanMs = lastScanMs
    scanCount += 1
    dirty = false
  }

  // ===== 可观测性（debug 模式性能报告）=====
  const debugEnabled = (): boolean => {
    try {
      if (localStorage.getItem('dsh-tidychat-debug') === '1') return true
      if ((window as any).__tidychatDebug === true) return true
      if (/[?&]tidychat-debug=1/.test(location.search)) return true
    } catch { /* ignore */ }
    return false
  }
  const report = (): void => {
    if (!debugEnabled()) return
    const st = activeSessionId !== null ? governor.get(activeSessionId) : undefined
    const turns = scopedRows('[data-chat-anchor-key]').filter((r) => r.getAttribute('data-chat-flow-kind') === 'user').length
    // 窗口化前 rendered == total；0.1.6 窗口化后 rendered < total
    console.log('[tidychat perf]', {
      sessionTurns: turns,
      scanMs: Math.round(lastScanMs),
      navItems: turns + '/' + turns,
      autoloadStatus: st?.status ?? 'n/a',
      autoloadPaused: st?.status === 'paused',
    })
  }
  ;(window as any).__tidychatReport = report
  ctx.effect(() => {
    const id = setInterval(report, 10000)
    return () => {
      clearInterval(id)
      if ((window as any).__tidychatReport === report) delete (window as any).__tidychatReport
    }
  })

  // ===== 一键报告问题：组装诊断报告 → 复制剪贴板 → 打开预填 GitHub issue =====
  // 会话快照中的用户轮次统计（与 DOM 轮次对照，用于诊断「快照/DOM 不同步」）——
  // 复用主链路 collectUserEvents，保证口径一致（surfaceOp append + source.kind 过滤）
  const snapshotUserTurns = (): number => {
    if (activeSessionId === null) return -1
    try {
      const binding = ctx.sessions.binding(activeSessionId)
      if (binding === undefined || binding.eventSource === undefined) return -1
      return collectUserEvents(binding.eventSource.getSnapshot()).length
    } catch { return -1 }
  }
  // 异常检测（报告正文「系统检测」段与标题共用）
  const detectIssues = (): string[] => {
    const st = activeSessionId !== null ? governor.get(activeSessionId) : undefined
    const issues: string[] = []
    if (peakScanMs >= SOFT_BUDGET_MS) issues.push(`扫描峰值 ${Math.round(peakScanMs)}ms（≥${SOFT_BUDGET_MS}ms 预算），可能存在卡顿迹象`)
    if (st?.status === 'paused') issues.push('自动加载已暂停（性能闸门触发）')
    if (!config.autoLoad) issues.push('自动加载已关闭，历史窗口偏小')
    if (config.autoLoad && findLoadOlderButton() !== null && st?.status === 'idle') issues.push('自动加载开启但未在加载，且仍有更早历史未加载')
    const snapTurns = snapshotUserTurns()
    const domTurns = railRows().length
    if (snapTurns >= 0 && snapTurns !== domTurns) issues.push(`会话快照 ${snapTurns} 轮 / DOM ${domTurns} 轮不一致（可能加载中或 DOM 更新滞后）`)
    return issues
  }
  const buildReport = (tags: ReadonlyArray<string>, issues: ReadonlyArray<string>): string => {
    const st = activeSessionId !== null ? governor.get(activeSessionId) : undefined
    const rows = scopedRows('[data-chat-anchor-key]')
    const turns = railRows().length
    const snapTurns = snapshotUserTurns()
    const hasMore = findLoadOlderButton() !== null
    return [
      '## 问题报告（dsh-tidychat 自动生成）',
      '',
      '### 环境',
      `- 时间：${new Date().toLocaleString()}`,
      '- DSH 版本：请运行 `dsh --version` 后填写（如 0.1.1-rc.2）',
      `- 插件版本：${__PLUGIN_VERSION__}`,
      `- 浏览器：${navigator.userAgent}`,
      '',
      '### 会话规模',
      `- 会话 ID：${activeSessionId ?? 'n/a'}`,
      `- 已加载用户轮次：${turns}（仅当前已加载窗口）`,
      `- 已加载消息行（含思考/工具调用）：${rows.length}`,
      `- 更早历史：${hasMore ? '仍有未加载（autoLoad 关闭或暂停时窗口偏小）' : '已全部加载'}`,
      '',
      '### 性能',
      `- 最近扫描耗时：${Math.round(lastScanMs)}ms`,
      `- 峰值扫描耗时：${Math.round(peakScanMs)}ms`,
      `- 本次页面已扫描：${scanCount} 次`,
      '',
      '### 自动加载',
      `- 开关：${config.autoLoad ? '开' : '关（历史不会自动加载完整，窗口偏小）'}`,
      `- 状态：${st?.status ?? 'n/a'}`,
      '',
      '### 定位条',
      `- 已渲染/快照轮次：${turns}/${snapTurns >= 0 ? snapTurns : 'n/a'}${snapTurns >= 0 && snapTurns !== turns ? ' ⚠️ 不一致（快照与 DOM 轮次数量不同，可能是加载中或 DOM 更新滞后）' : ''}`,
      '',
      '### 开关配置',
      `- fold: ${config.fold} / divider: ${config.divider} / navigator: ${config.navigator} / autoLoad: ${config.autoLoad}`,
      ...(issues.length > 0 ? ['', '### 系统检测（自动）', ...issues.map((i) => `- ⚠️ ${i}`)] : []),
      '',
      '### 问题描述',
      ...(tags.length > 0 ? [`- 现象：${tags.join('、')}`] : []),
      tags.length === 0 && issues.length === 0
        ? '（请描述遇到的问题，例如：长会话滚动卡顿、定位条不显示、自动加载异常…）'
        : '（如无需补充说明，直接提交即可）',
    ].join('\n')
  }
  const reportAndOpenIssue = (tags: ReadonlyArray<string>): void => {
    const issues = detectIssues()
    const text = buildReport(tags, issues)
    const subject = tags.length > 0 ? tags.join('、') : (issues.length > 0 ? '检测到异常' : '问题反馈')
    const title = `[问题报告] ${subject}（插件 v${__PLUGIN_VERSION__}）`
    try { navigator.clipboard?.writeText(text) } catch { /* 剪贴板失败时预填 URL 仍可用 */ }
    window.open('https://github.com/BananaSoldier01/dsh-tidychat/issues/new?title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(text), '_blank')
  }

  // ===== 定位条配色：默认色（auto 背景自适应 / 手动色系×明度）+ 强调色（色系×明度）=====
  // canvas 绘制时从 CSS 变量取值（applyNavColors 统一写入），redraw 不重复计算。
  // 每个色系 5 档明度 [l1 极浅, l2 浅, l3 中, l4 深, l5 极深]——正交组合即 hue × light 查表。
  const NAV_HUE_PALETTE: Record<string, [string, string, string, string, string]> = {
    gray: ['rgba(225,225,225,0.9)', 'rgba(190,190,190,0.78)', 'rgba(128,128,128,0.8)', 'rgba(70,70,70,0.85)', 'rgba(20,20,20,0.92)'],
    black: ['rgba(90,90,90,0.8)', 'rgba(60,60,60,0.85)', 'rgba(30,30,30,0.9)', 'rgba(12,12,12,0.94)', 'rgba(0,0,0,0.97)'],
    white: ['rgba(255,255,255,0.95)', 'rgba(250,250,250,0.9)', 'rgba(240,240,240,0.85)', 'rgba(225,225,225,0.8)', 'rgba(205,205,205,0.75)'],
    blue: ['#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1e40af'],
    violet: ['#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#5b21b6'],
    cyan: ['#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#155e75'],
    green: ['#86efac', '#4ade80', '#22c55e', '#16a34a', '#166534'],
    orange: ['#fdba74', '#fb923c', '#f97316', '#ea580c', '#9a3412'],
    red: ['#fca5a5', '#f87171', '#ef4444', '#dc2626', '#991b1b'],
  }
  const NAV_LIGHT_IDX: Record<string, number> = { l1: 0, l2: 1, l3: 2, l4: 3, l5: 4 }
  const hueColor = (hue: unknown, light: unknown, fallback: string): string => {
    if (typeof hue === 'string') {
      const palette = NAV_HUE_PALETTE[hue]
      if (palette !== undefined) return palette[NAV_LIGHT_IDX[typeof light === 'string' ? light : 'l3'] ?? 2]
    }
    return fallback
  }
  // 解析颜色，返回 [r, g, b, a]；兼容历史 rgba/rgb 逗号语法、空格 + `/` 语法、#rgb/#rgba/#rrggbb/#rrggbbaa、transparent
  const parseRgba = (s: string): [number, number, number, number] | null => {
    const t = (s ?? '').trim().toLowerCase()
    if (t === '') return null
    if (t === 'transparent') return [0, 0, 0, 0]
    const hex = /^#([0-9a-f]{3,8})$/.exec(t)
    if (hex !== null) {
      let h = hex[1]
      if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('')
      if (h.length === 6) h += 'ff'
      const n = parseInt(h, 16)
      return [(n >> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, Math.round(((n & 255) / 255) * 1000) / 1000]
    }
    const num = (x: string, base: number): number | null => {
      const v = x.trim()
      if (v === '') return null
      const p = v.endsWith('%') ? Number(v.slice(0, -1)) : Number(v)
      if (Number.isNaN(p)) return null
      if (base === 255 && v.endsWith('%')) return Math.round((p / 100) * 255)
      if (base === 1 && v.endsWith('%')) return p / 100
      return base === 1 ? p : Math.round(p)
    }
    const comma = /^rgba?\(\s*([\d.]+%?)\s*,\s*([\d.]+%?)\s*,\s*([\d.]+%?)(?:\s*,\s*([\d.]+%?))?\s*\)$/.exec(t)
    if (comma !== null) {
      const r = num(comma[1], 255); const g = num(comma[2], 255); const b = num(comma[3], 255)
      const a = comma[4] !== undefined ? num(comma[4], 1) : 1
      if (r === null || g === null || b === null || a === null) return null
      return [r, g, b, a]
    }
    const space = /^rgba?\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+%?)(?:\s*\/\s*([\d.]+%?))?\s*\)$/.exec(t)
    if (space !== null) {
      const r = num(space[1], 255); const g = num(space[2], 255); const b = num(space[3], 255)
      const a = space[4] !== undefined ? num(space[4], 1) : 1
      if (r === null || g === null || b === null || a === null) return null
      return [r, g, b, a]
    }
    return null
  }
  const parseRgb = (s: string): [number, number, number] | null => {
    const a = parseRgba(s)
    return a === null ? null : [a[0], a[1], a[2]]
  }
  // 向上冒泡找第一个有效非透明背景（alpha=0 跳过）
  const findBackgroundRgb = (): [number, number, number] | null => {
    try {
      let el: Element | null = findScrollContainer()
      while (el !== null) {
        const rgba = parseRgba(getComputedStyle(el).backgroundColor)
        if (rgba !== null && rgba[3] > 0) return [rgba[0], rgba[1], rgba[2]]
        el = el.parentElement
      }
    } catch { /* 忽略，走兜底 */ }
    return null
  }
  const isDarkBackground = (): boolean => {
    const rgb = findBackgroundRgb()
    if (rgb !== null) return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] < 128
    try {
      if (typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches) return true
    } catch { /* 忽略 */ }
    return false
  }
  // WCAG 近似相对对比度（指示性元素用 3:1 即可，不必正文级 4.5）
  const contrastRatio = (a: [number, number, number], b: [number, number, number]): number => {
    const lum = (c: [number, number, number]): number => {
      const f = (v: number): number => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
      }
      return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])
    }
    const la = lum(a)
    const lb = lum(b)
    const hi = Math.max(la, lb)
    const lo = Math.min(la, lb)
    return (hi + 0.05) / (lo + 0.05)
  }
  // 自定义色：只接受能被 parseRgba 解析的颜色（#rgb/#rrggbb/#rrggbbaa、rgb()/rgba()），否则回退。
  const validColor = (raw: unknown, fallback: string): string => {
    if (typeof raw !== 'string') return fallback
    const s = raw.trim()
    if (s === '') return fallback
    return parseRgba(s) !== null ? s : fallback
  }
  const resolveNavColors = (): { bar: string; hot: string } => {
    const cs = getComputedStyle(document.documentElement)
    const brand = cs.getPropertyValue('--dsw-alias-state-business-primary').trim() || '#3b82f6'
    const caption = cs.getPropertyValue('--dsw-alias-label-caption').trim() || 'rgba(127,127,127,0.5)'
    // 默认色 auto = 尊重主题：优先用宿主 label-caption，与实际背景对比不足时才切纠偏灰
    const autoBar = (): string => {
      const captionRgb = parseRgb(caption)
      const bgRgb = findBackgroundRgb()
      if (captionRgb !== null && bgRgb !== null && contrastRatio(captionRgb, bgRgb) >= 3) return caption
      return isDarkBackground() ? 'rgba(226,226,226,0.85)' : 'rgba(80,80,80,0.78)'
    }
    // 默认色：auto / custom（调色盘选色）/ 历史色系（gray…red × 明度）
    const colorMode = config.navColor ?? 'auto'
    const bar = colorMode === 'auto' ? autoBar()
      : colorMode === 'custom' ? validColor(config.navColorCustom, autoBar())
      : hueColor(colorMode, config.navColorLight, caption)
    // 强调色：auto = 跟随主题品牌色；custom = 调色盘选色；历史色系 = 色系 × 明度
    const accentMode = config.navAccent ?? 'auto'
    const hot = accentMode === 'auto' ? brand
      : accentMode === 'custom' ? validColor(config.navAccentCustom, brand)
      : hueColor(accentMode, config.navAccentLight, brand)
    return { bar, hot }
  }
  // 保守兜底（仅提示卡）：只有当浮层背景「不透明」（alpha ≥ 0.85）且 label token 与背景
  // 对比 <3:1 时才写入纠偏色；玻璃/半透明浮层、无法解析的背景一律清空变量、跟随 token。
  // 这样官方深色（半透明白玻璃）与样式主题保持 token 跟随，仅异常的不透明皮肤被纠正。
  const applyTipContrast = (): void => {
    const root = document.documentElement
    // 主题 token 定义在 body 作用域（body / body[data-ds-dark-theme]），
    // 从 html 读 computed 值永远是空串，会拿 '#222' 兜底值代替真实 token 测对比度。
    const cs = getComputedStyle(document.body)
    const tipBg = parseRgba(cs.getPropertyValue('--dsw-alias-bg-layer-3').trim())
    const update = (key: string, token: string): void => {
      if (tipBg === null || tipBg[3] < 0.85) { root.style.removeProperty(key); return }
      const rgb = parseRgb(token)
      const darkBg = 0.2126 * tipBg[0] + 0.7152 * tipBg[1] + 0.0722 * tipBg[2] < 128
      const corrected = darkBg ? 'rgba(235,235,235,0.92)' : 'rgba(55,55,55,0.92)'
      if (rgb === null || contrastRatio(rgb, [tipBg[0], tipBg[1], tipBg[2]]) >= 3) { root.style.removeProperty(key); return }
      if (root.style.getPropertyValue(key) !== corrected) root.style.setProperty(key, corrected)
    }
    update('--tidychat-nav-tip-text', cs.getPropertyValue('--dsw-alias-label-primary').trim() || '#222')
    update('--tidychat-nav-tip-head', cs.getPropertyValue('--dsw-alias-label-secondary').trim() || '#666')
  }
  // 写入供 canvas 读取的 CSS 变量（值相同不重复写，避免触发主题观察器死循环）
  const applyNavColors = (): void => {
    const { bar, hot } = resolveNavColors()
    const root = document.documentElement
    if (root.style.getPropertyValue('--tidychat-nav-color') !== bar) root.style.setProperty('--tidychat-nav-color', bar)
    if (root.style.getPropertyValue('--tidychat-nav-color-hot') !== hot) root.style.setProperty('--tidychat-nav-color-hot', hot)
    applyTipContrast()
  }

  // 接管官方右缘消息轨（DSH 0.1.2+ 原生 TurnNavigator）：只切根元素属性，隐藏交给 CSS 规则。
  // 用属性而非直接操作 DOM —— 官方轨由宿主 React 渲染，删节点会在下次渲染被还原。
  // 注意：属性名不在主题观察器的 attributeFilter 里，不会触发观察器回环。
  const applyOfficialNavTakeover = (): void => {
    const root = document.documentElement
    if (config.hideOfficialNav === true) {
      if (!root.hasAttribute('data-tidychat-hide-official-nav')) root.setAttribute('data-tidychat-hide-official-nav', '')
    } else if (root.hasAttribute('data-tidychat-hide-official-nav')) {
      root.removeAttribute('data-tidychat-hide-official-nav')
    }
  }

  // 设置读取 + 订阅（设置面板改动即时生效）
  if (settingsScope !== null) {
    const readConfig = (): void => {
      try {
        const snap = settingsScope.getSnapshot()
        if (snap !== null && snap !== undefined && snap.status === 'ready' && snap.value) {
          config.fold = snap.value.fold ?? true
          config.divider = snap.value.divider ?? true
          config.navigator = snap.value.navigator ?? true
          config.hideOfficialNav = snap.value.hideOfficialNav === true
          config.autoLoad = snap.value.autoLoad ?? true
          config.navColor = typeof snap.value.navColor === 'string' ? snap.value.navColor : 'auto'
          config.navColorCustom = typeof snap.value.navColorCustom === 'string' ? snap.value.navColorCustom : ''
          config.navColorLight = typeof snap.value.navColorLight === 'string' ? snap.value.navColorLight : 'l3'
          config.navAccent = typeof snap.value.navAccent === 'string' ? snap.value.navAccent : 'auto'
          config.navAccentCustom = typeof snap.value.navAccentCustom === 'string' ? snap.value.navAccentCustom : ''
          config.navAccentLight = typeof snap.value.navAccentLight === 'string' ? snap.value.navAccentLight : 'l3'
          config.navSide = snap.value.navSide === 'right' ? 'right' : 'left'
          config.navStyle = snap.value.navStyle === 'dot' ? 'dot' : 'bar'
          config.navRing = snap.value.navRing === true
        }
      } catch { /* keep defaults */ }
    }
    readConfig()
    applyNavColors()
    applyOfficialNavTakeover()
    ctx.effect(() => {
      let unsub: () => void = () => {}
      try {
        unsub = settingsScope.subscribe(() => {
          readConfig()
          applyNavColors()
          applyOfficialNavTakeover()
          scan()
          // 配置里影响定位条布局/样式的项（navSide/navStyle/配色）变化时立即重排重绘
          notify()
          if (config.autoLoad && activeSessionId !== null) scheduleNext(activeSessionId)
        })
      } catch { /* ignore */ }
      return () => { try { unsub() } catch { /* ignore */ } }
    })
  }

  scan()
  applyNavColors()
  applyOfficialNavTakeover()

  // 主观察器（收窄到会话滚动容器）——提升到 apply 作用域，便于会话切换时立即重绑。
  let mainObserver: MutationObserver | null = null
  let mainTarget: Node = document.body
  let mainPending: ReturnType<typeof setTimeout> | null = null
  const rebindMainObserver = (): void => {
    const container = findScrollContainer()
    const next: Node = container ?? document.body
    if (mainObserver !== null && next === mainTarget) return
    if (mainObserver !== null) mainObserver.disconnect()
    mainTarget = next
    mainObserver = new MutationObserver((muts) => {
      // 只关心“非插件自插”的节点变更；插件自己插入/移动的 data-tidychat-* 节点不触发重扫，
      // 避免 控制条/分隔线 被 observer 反复重插造成循环。
      const isTidychatNode = (n: Node): boolean => n instanceof Element && Array.from(n.attributes).some((a) => a.name.startsWith('data-tidychat-'))
      const relevant = muts.some((m) => [...m.addedNodes, ...m.removedNodes].some((n) => !isTidychatNode(n)))
      if (!relevant) return
      dirty = true
      if (mainPending !== null) return
      mainPending = setTimeout(() => { mainPending = null; if (!isGovernorBusy()) scan() }, 250)
    })
    mainObserver.observe(mainTarget, { childList: true, subtree: true })
  }

  // 主题切换（:root 的 class / style / data-theme 变化）时重算定位条自动配色；
  // applyNavColors 值不变时不写 style，避免与观察器互相触发。
  ctx.effect(() => {
    if (typeof MutationObserver === 'undefined') return
    const themeObs = new MutationObserver(() => { applyNavColors() })
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })
    return () => {
      themeObs.disconnect()
      // 卸载时清掉写入 :root 的临时 CSS 变量与接管属性，避免残留污染宿主主题
      document.documentElement.style.removeProperty('--tidychat-nav-color')
      document.documentElement.style.removeProperty('--tidychat-nav-color-hot')
      document.documentElement.style.removeProperty('--tidychat-nav-tip-text')
      document.documentElement.style.removeProperty('--tidychat-nav-tip-head')
      document.documentElement.removeAttribute('data-tidychat-hide-official-nav')
    }
  })

  ctx.effect(() => {
    rebindMainObserver()
    const intervalId = setInterval(() => { rebindMainObserver(); applyNavColors(); if (!isGovernorBusy() && dirty) scan() }, 5000)
    return () => {
      if (mainObserver !== null) mainObserver.disconnect()
      mainObserver = null
      clearInterval(intervalId)
      if (mainPending !== null) clearTimeout(mainPending)
    }
  })

  // 定位条横向占用：rail padding 2px + slot padding 6px×2 + 横线最宽 30px ≈ 44px，留 4px 余量
  const NAV_RAIL_WIDTH = 48

  const measurePos = (): { left: number; top: number; gutter: number } | null => {
    // 新版 DSH 里 [data-slot="conversation.session"] 是 0×0 的空壳元素（slot host 未参与布局），
    // 用它测 rect 必然返回 null，导致定位条永远落到写死的 fallback。
    // 改用真实会话滚动容器 [data-conversation-scroll] 作为锚点，贴住会话区实际左缘。
    const host = document.querySelector('[data-conversation-scroll]')
    if (host === null) return null
    const r = host.getBoundingClientRect()
    if (r.width < 10 || r.height < 10) return null
    // 会话内容居中且 max-width 748px：宽窗口时左右有留白，窄窗口时内容铺满、留白归零，
    // 定位条会压到正文/输入框。测「最贴目标侧边缘的内容元素」与容器边缘的间距（gutter），
    // 不足定位条宽度即隐藏。参照候选 = 输入框卡片 + 首个/末个会话行：输入框可能比消息
    // 内容更宽（更贴边），只取单一参照会低估 gutter 导致右缘轨被误隐藏。
    const composer = scopedRows('[data-composer-card]')[0]
    const chatRows = scopedRows('[data-chat-anchor-key]')
    const candidates = [composer, chatRows[0], chatRows[chatRows.length - 1]].filter((x): x is Element => x !== null && x !== undefined)
    const rects = candidates.map((el) => el.getBoundingClientRect())
    if ((config.navSide ?? 'left') === 'right') {
      const maxRight = rects.length > 0 ? Math.max(...rects.map((e) => e.right)) : r.right
      const gutter = Math.max(0, r.right - maxRight)
      return { left: r.right - (NAV_RAIL_WIDTH - 4), top: r.top + r.height * 0.5, gutter }
    }
    const minLeft = rects.length > 0 ? Math.min(...rects.map((e) => e.left)) : r.left
    const gutterL = Math.max(0, minLeft - r.left)
    return { left: r.left, top: r.top + r.height * 0.5, gutter: gutterL }
  }

  const hhmm = (ms: number): string => {
    const d = new Date(ms)
    const pad = (n: number) => (n < 10 ? '0' + n : String(n))
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
  }

  // ===== Adaptive Conversation Navigation Rail（v0.2.0 Canvas Minimap）=====
  const NAV_RAIL_BAR_H = 3
  const NAV_RAIL_BAR_LEN = 14
  const NAV_RAIL_BAR_LEN_NEAR = 26
  const NAV_RAIL_BAR_LEN_CURRENT = 22
  const NAV_RAIL_FISH_EYE_RADIUS = 4
  const NAV_RAIL_FISH_EYE_BOOST = 0.5
  const NAV_RAIL_TURN_SPACING = 12
  const NAV_RAIL_MIN_HEIGHT = 48
  const HEADER_OFFSET = 64
  // 外圈（独立开关 navRing）：1px 描边、外扩 2px，画在插件自己的横线/圆点包围盒之外，仅当前轮与悬停轮。
  const NAV_RAIL_RING_W = 1
  const NAV_RAIL_RING_OFFSET = 2

  // 轨道高度自适应：turn 少时按 12px/轮 收紧（不用最大高度），turn 多时封顶 min(70vh, 660px)
  const railHeight = (n: number): number => Math.min(Math.min(window.innerHeight * 0.7, 660), Math.max(NAV_RAIL_MIN_HEIGHT, n * NAV_RAIL_TURN_SPACING))

  // 圆角矩形路径：外圈描边用。不走 ctx.roundRect（Chromium 99+ 才有），用 arcTo 自绘，
  // 与项目既有的「旧内核兜底」风格一致（见配色 color-mix 兜底）。
  const roundRectPath = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void => {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2))
    c.beginPath()
    c.moveTo(x + rr, y)
    c.arcTo(x + w, y, x + w, y + h, rr)
    c.arcTo(x + w, y + h, x, y + h, rr)
    c.arcTo(x, y + h, x, y, rr)
    c.arcTo(x, y, x + w, y, rr)
    c.closePath()
  }

  // 导航条（挂到会话头部 utilities 槽，fixed 定位到聊天区左缘；独立开关 navigator）
  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register(
    { name: 'conversation.session.header.utilities', id: 'tidychat-nav' },
    (props: any) => {
      const [pos, setPos] = React.useState<{ left: number; top: number; gutter: number } | null>(null)
      const [snapshot, setSnapshot] = React.useState<any>(null)
      const [tip, setTip] = React.useState<any>(null)
      const [hover, setHover] = React.useState<number | null>(null)
      const [current, setCurrent] = React.useState<number | null>(null)
      const [enabled, setEnabled] = React.useState<boolean>(config.navigator)
      const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
      // pointermove 节流：高频事件只记录最新坐标，rAF 帧内统一处理一次（避免每事件一次 React 渲染）
      const moveRafRef = React.useRef(0)
      const moveLastRef = React.useRef<{ x: number; y: number } | null>(null)
      // 行位置缓存：scroll 无关的内容坐标（相对滚动容器），供「当前 turn 检测 + 跳转」二分。
      // scrollH 记录缓存构建时的容器内容高度——折叠/加载会改变布局（行数可能不变但位置变），用它判定重算。
      const rowCacheRef = React.useRef<{ rows: Element[]; tops: number[]; count: number; scrollH: number }>({ rows: [], tops: [], count: -1, scrollH: -1 })

      // 用户行 = 'user'（开新回合）+ 'steering'（运行中插队，宿主渲染为独立 kind）二者同视，
      // 与主链路/诊断共用模块级 railRows（口径统一）
      const userRows = (): Element[] => railRows()
      const rebuildRowCache = (count: number, scrollH: number): void => {
        const rows = userRows()
        const container = findScrollContainer()
        if (container === null) { rowCacheRef.current = { rows: [], tops: [], count, scrollH }; return }
        const cRect = container.getBoundingClientRect()
        const tops = rows.map((r) => r.getBoundingClientRect().top - cRect.top + container.scrollTop)
        rowCacheRef.current = { rows, tops, count, scrollH }
      }
      // 当前 turn = 阅读区顶部（容器顶 + header 偏移）最近的上方 user 行
      const detectCurrent = (): void => {
        const container = findScrollContainer()
        const tops = rowCacheRef.current.tops
        if (container === null || tops.length === 0) return
        const target = container.scrollTop + HEADER_OFFSET
        let lo = 0; let hi = tops.length - 1; let ans = -1
        while (lo <= hi) {
          const mid = (lo + hi) >> 1
          if (tops[mid] <= target) { ans = mid; lo = mid + 1 } else hi = mid - 1
        }
        const cur = ans === -1 ? 0 : ans
        setCurrent((p) => (p === cur ? p : cur))
      }

      // 鱼眼布局：hover 附近 ±R 间距放大，远处自动压缩（简单权重模型，无复杂数理）
      const layoutPositions = (n: number, hoverIdx: number | null, H: number): number[] => {
        const weights: number[] = []
        for (let i = 0; i < n; i++) {
          let w = 1
          if (hoverIdx !== null) {
            const d = Math.abs(i - hoverIdx)
            if (d <= NAV_RAIL_FISH_EYE_RADIUS) w = 1 + (NAV_RAIL_FISH_EYE_RADIUS - d + 1) * NAV_RAIL_FISH_EYE_BOOST
          }
          weights.push(w)
        }
        const total = weights.reduce((a, b) => a + b, 0)
        const usable = Math.max(H - NAV_RAIL_BAR_H, 1)
        const pos: number[] = []
        let acc = 0
        for (let i = 0; i < n; i++) {
          acc += weights[i]
          pos.push(((acc - weights[i] / 2) / total) * usable + NAV_RAIL_BAR_H / 2)
        }
        return pos
      }
      // 命中测试：与绘制共用同一布局函数，所见即所得（positions 单调，二分）
      const indexFromY = (y: number, positions: number[]): number => {
        if (positions.length === 0) return 0
        let lo = 0; let hi = positions.length - 1
        while (lo < hi) {
          const mid = (lo + hi) >> 1
          if (positions[mid] < y) lo = mid + 1
          else hi = mid
        }
        const cur = positions[lo]
        const prev = lo > 0 ? positions[lo - 1] : -Infinity
        const candidate = Math.abs(cur - y) <= Math.abs(prev - y) ? lo : lo - 1
        return Math.max(0, Math.min(positions.length - 1, candidate))
      }

      const redraw = (): void => {
        const canvas = canvasRef.current
        if (canvas === null) return
        const n = turns.length
        if (n === 0) return
        const H = railHeight(turns.length)
        const W = NAV_RAIL_WIDTH - 8
        const dpr = window.devicePixelRatio || 1
        if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
          canvas.width = Math.round(W * dpr)
          canvas.height = Math.round(H * dpr)
          canvas.style.width = W + 'px'
          canvas.style.height = H + 'px'
        }
        const ctx = canvas.getContext('2d')
        if (ctx === null) return
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, W, H)
        const cs = getComputedStyle(document.documentElement)
        // 配色优先读 applyNavColors 写入的变量，未写入（旧版兜底）再回退到主题 token
        const barColor = cs.getPropertyValue('--tidychat-nav-color').trim() || cs.getPropertyValue('--dsw-alias-label-caption').trim() || 'rgba(127,127,127,0.5)'
        const hotColor = cs.getPropertyValue('--tidychat-nav-color-hot').trim() || cs.getPropertyValue('--dsw-alias-state-business-primary').trim() || '#3b82f6'
        // 右缘镜像：横线从画布右缘向左生长，强调三角指左；圆点模式：小圆点 + 鱼眼放大
        const mirror = (config.navSide ?? 'left') === 'right'
        const dot = (config.navStyle ?? 'bar') === 'dot'
        const dir = mirror ? -1 : 1
        const positions = layoutPositions(n, hover, H)
        const nearest = (i: number): boolean => hover !== null && Math.abs(i - hover) <= 2
        for (let i = 0; i < n; i++) {
          const y = positions[i]
          const isCurrent = current === i
          const isHover = hover === i
          const color = isCurrent || isHover ? hotColor : barColor
          ctx.fillStyle = color
          if (dot) {
            // 圆点半径适中：常态 2.5px，鱼眼邻域 3.2px，当前/悬停 4px；不画强调三角
            const rad = isCurrent || isHover ? 4 : (nearest(i) ? 3.2 : 2.5)
            const cx = mirror ? W - NAV_RAIL_BAR_LEN / 2 : NAV_RAIL_BAR_LEN / 2
            ctx.beginPath()
            ctx.arc(cx, y, rad, 0, Math.PI * 2)
            ctx.fill()
          } else {
            const len = isHover ? NAV_RAIL_BAR_LEN_NEAR : (isCurrent ? NAV_RAIL_BAR_LEN_CURRENT : (nearest(i) ? NAV_RAIL_BAR_LEN + 4 : NAV_RAIL_BAR_LEN))
            ctx.fillRect(mirror ? W - len : 0, y - NAV_RAIL_BAR_H / 2, len, NAV_RAIL_BAR_H)
            // 当前 turn 的强调指针（仅横线模式）：左缘时在条右侧指右，右缘镜像后在条左侧指左
            if (isCurrent) {
              const headX = mirror ? W - len - 2 : len + 2
              ctx.beginPath()
              ctx.moveTo(headX, y)
              ctx.lineTo(headX + dir * 4, y - 3)
              ctx.lineTo(headX + dir * 4, y + 3)
              ctx.closePath()
              ctx.fill()
            }
          }
      }
        // ===== 外圈（独立开关 navRing）=====
        // 与上面两个绘制分支共用同一套尺寸常量：若改动绘制分支的尺寸，必须同步 boxOf()。
        // 只描当前轮与悬停轮；颜色用强调色（--tidychat-nav-color-hot），不新增任何颜色配置。
        const boxOf = (i: number, y: number, isCurrent: boolean, isHover: boolean): { x: number; y: number; w: number; h: number; dot: boolean } => {
          if (dot) {
            const rad = isCurrent || isHover ? 4 : (nearest(i) ? 3.2 : 2.5)
            const cx = mirror ? W - NAV_RAIL_BAR_LEN / 2 : NAV_RAIL_BAR_LEN / 2
            return { x: cx - rad, y: y - rad, w: rad * 2, h: rad * 2, dot: true }
          }
          const len = isHover ? NAV_RAIL_BAR_LEN_NEAR : (isCurrent ? NAV_RAIL_BAR_LEN_CURRENT : (nearest(i) ? NAV_RAIL_BAR_LEN + 4 : NAV_RAIL_BAR_LEN))
          return { x: mirror ? W - len : 0, y: y - NAV_RAIL_BAR_H / 2, w: len, h: NAV_RAIL_BAR_H, dot: false }
        }
        if (config.navRing === true) {
          const ringOffset = NAV_RAIL_RING_OFFSET
          ctx.strokeStyle = hotColor
          ctx.lineWidth = NAV_RAIL_RING_W
          for (let i = 0; i < n; i++) {
            const isCurrent = current === i
            const isHover = hover === i
            if (!isCurrent && !isHover) continue
            const b = boxOf(i, positions[i], isCurrent, isHover)
            if (b.dot) {
              ctx.beginPath()
              ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 + ringOffset, 0, Math.PI * 2)
              ctx.stroke()
            } else {
              // 横线外圈取胶囊形（圆角 = 半高 + 外扩），与圆头短横的观感一致
              roundRectPath(ctx, b.x - ringOffset, b.y - ringOffset, b.w + ringOffset * 2, b.h + ringOffset * 2, b.h / 2 + ringOffset)
              ctx.stroke()
            }
          }
        }
      }

      React.useEffect(() => {
        const sid = props.sessionId
        // 会话桥：无论定位条开关与否，都把当前 sessionId 喂给 governor 并隔离其状态。
        if (typeof sid === 'string' && sid !== '') {
          activeSessionId = sid
          if (!governor.has(sid)) {
            governor.set(sid, { generation: 0, status: 'idle', consecutiveSlow: 0, nullStreak: 0 })
          }
          rebindMainObserver()
          scheduleNext(sid)
        }
        if (typeof sid === 'undefined' || sid === null) return
        const binding = ctx.sessions.binding(sid)
        // 事件流订阅 = 触发器 + 摘要/时间增强源，不是事实源（圆点身份/数量以 DOM 行 railRows 为准）。
        // 事件增减与行增减强相关（新消息先落账再渲染行），订阅即「DOM 可能变了」信号 → 重渲染 → 从 DOM 重算 turns。
        // （历史备注：0.1.2+ 的 session.getSnapshot() 只返回 queue/running 等控制字段，旧路径按 snapshot.nodes
        // 取数会解析出 0 个用户轮 → 定位条整个不渲染，见 RAIL-ROOT-CAUSE-ANALYSIS §0。）
        if (binding === undefined || binding.eventSource === undefined) return
        const face = binding.eventSource
        const pull = () => {
          let snap: any = null
          try { snap = face.getSnapshot() } catch { snap = null }
          setSnapshot(snap)
        }
        pull()
        let unsub: () => void = () => {}
        try { unsub = face.subscribe(pull) } catch { unsub = () => {} }
        const refresh = () => { setPos(measurePos()); setEnabled(config.navigator) }
        refresh()
        listeners.push(refresh)
        // 侧栏展开/收起会改变会话容器尺寸，ResizeObserver + window resize 立即重排，消除 5s 兜底延迟
        let resizeObs: ResizeObserver | null = null
        const container = findScrollContainer()
        if (container !== null && typeof ResizeObserver !== 'undefined') {
          resizeObs = new ResizeObserver(() => { refresh() })
          resizeObs.observe(container)
        }
        window.addEventListener('resize', refresh)
        // 滚动监听：检测「阅读区顶部」的当前 turn（rAF 节流）。
        // 顺带自检 scrollH 漂移（图片/代码块懒加载会改变行高）：过期几何 = 同类错位的第三张脸，
        // 漂移即重建行缓存再检测，整数比较每帧成本≈0。
        let scrollRaf = 0
        const onScroll = (): void => {
          if (scrollRaf !== 0) return
          scrollRaf = requestAnimationFrame(() => {
            scrollRaf = 0
            const c = findScrollContainer()
            if (c !== null && c.scrollHeight !== rowCacheRef.current.scrollH) rebuildRowCache(turns.length, c.scrollHeight)
            detectCurrent()
          })
        }
        if (container !== null) container.addEventListener('scroll', onScroll, { passive: true })
        return () => {
          try { unsub() } catch { /* ignore */ }
          const i = listeners.indexOf(refresh)
          if (i >= 0) listeners.splice(i, 1)
          resizeObs?.disconnect()
          window.removeEventListener('resize', refresh)
          if (container !== null) container.removeEventListener('scroll', onScroll)
          if (scrollRaf !== 0) cancelAnimationFrame(scrollRaf)
          if (moveRafRef.current !== 0) cancelAnimationFrame(moveRafRef.current)
        }
      }, [props.sessionId])

      // DOM 单一事实源：圆点身份/数量/顺序来自 DOM 行（railRows），事件流仅作摘要/时间增强。
      // 数量相等时按序配对（事件序 = log seq 序 = DOM 序）；不等（加载中/replace 事件/窗口边缘瞬态）
      // 时回退行内文本自愈——构造上不可能出现「圆点无对应行」的死点（RAIL-ROOT-CAUSE-ANALYSIS §6）。
      const rows = railRows()
      const events = collectUserEvents(snapshot)
      const turns: Array<{ el: Element; summary: string; time: number | null }> = events.length === rows.length
        ? rows.map((el, i) => ({ el, summary: events[i]!.summary, time: events[i]!.time as number | null }))
        : rows.map((el) => ({ el, summary: fallbackSummary(el), time: null }))

      // 每轮渲染后：行数或内容高度变化（折叠/加载）→ 重建行缓存 → 检测当前 turn → 重绘 canvas
      React.useEffect(() => {
        const container = findScrollContainer()
        const scrollH = container !== null ? container.scrollHeight : 0
        if (rowCacheRef.current.count !== turns.length || rowCacheRef.current.scrollH !== scrollH) {
          rebuildRowCache(turns.length, scrollH)
        }
        detectCurrent()
        redraw()
      })

      const jumpTo = (index: number): void => {
        // 元素即身份：turns 由 DOM 行生成，index 必有对应行；rowCacheRef 仅剩 detectCurrent 在用
        const t = turns[index]
        if (t === undefined) return
        const container = findScrollContainer()
        if (container === null) return
        const cRect = container.getBoundingClientRect()
        const tRect = t.el.getBoundingClientRect()
        // 用户消息出现在阅读区顶部（header 之下），而非 viewport 中心或埋进 header
        container.scrollTo({ top: (tRect.top - cRect.top) + container.scrollTop - HEADER_OFFSET, behavior: 'smooth' })
      }
      const handlePointerMove = (ev: React.PointerEvent<HTMLCanvasElement>): void => {
        moveLastRef.current = { x: ev.clientX, y: ev.clientY }
        if (moveRafRef.current !== 0) return
        moveRafRef.current = requestAnimationFrame(() => {
          moveRafRef.current = 0
          const p = moveLastRef.current
          moveLastRef.current = null
          if (p === null || canvasRef.current === null) return
          const canvas = canvasRef.current
          const rect = canvas.getBoundingClientRect()
          const idx = indexFromY(p.y - rect.top, layoutPositions(turns.length, hover, railHeight(turns.length)))
          if (idx !== hover) setHover(idx)
          const u = turns[idx]
          if (u !== undefined) {
            // 右缘镜像：tip.x 记鼠标左侧 18px，渲染改用 right 定位（left+translateX(-100%)
            // 会把收缩适配宽度压到「视口宽-left」≈40px，泡泡被挤成一条细窄条）
            const mirror = (config.navSide ?? 'left') === 'right'
            setTip({ x: mirror ? p.x - 18 : p.x + 18, y: p.y - 8, num: idx + 1, time: u.time !== undefined && u.time !== null ? hhmm(u.time) : '', text: u.summary, mirror })
          }
        })
      }
      const handlePointerLeave = (): void => {
        if (moveRafRef.current !== 0) { cancelAnimationFrame(moveRafRef.current); moveRafRef.current = 0 }
        moveLastRef.current = null
        setHover(null); setTip(null)
      }
      const handlePointerDown = (ev: React.PointerEvent<HTMLCanvasElement>): void => {
        try { ev.currentTarget.setPointerCapture(ev.pointerId) } catch { /* 老浏览器忽略 */ }
      }
      const handlePointerUp = (ev: React.PointerEvent<HTMLCanvasElement>): void => {
        const canvas = canvasRef.current
        if (canvas !== null) {
          const rect = canvas.getBoundingClientRect()
          const idx = indexFromY(ev.clientY - rect.top, layoutPositions(turns.length, hover, railHeight(turns.length)))
          jumpTo(idx)
        }
        try { ev.currentTarget.releasePointerCapture(ev.pointerId) } catch { /* 忽略 */ }
        setHover(null)
        setTip(null)
      }

      if (!enabled) return null
      // 宿主布局未就绪（拿不到会话左缘）时不渲染，避免出现在写死的 280px 猜测位
      if (pos === null) return null
      // 会话内容左侧留白不足以容纳定位条时隐藏（Codex 同款「空间足够才显示」）
      if (pos.gutter < NAV_RAIL_WIDTH) return null
      if (turns.length === 0) return null
      const style = { left: pos.left + 'px', top: pos.top + 'px' }
      const rail = React.createElement('div', {
        className: 'tidychat-nav-rail',
        style: Object.assign({ transform: 'translateY(-50%)' }, style),
        'aria-label': '用户消息定位',
      }, React.createElement('canvas', {
        ref: canvasRef,
        className: 'tidychat-nav-canvas',
        onPointerMove: handlePointerMove,
        onPointerLeave: handlePointerLeave,
        onPointerDown: handlePointerDown,
        onPointerUp: handlePointerUp,
      }))
      const tipEl = tip === null ? null : React.createElement('div', {
        className: 'tidychat-nav-tip',
        style: tip.mirror
          ? { right: Math.max(0, window.innerWidth - tip.x) + 'px', top: tip.y + 'px' }
          : { left: tip.x + 'px', top: tip.y + 'px' },
      },
        React.createElement('div', { className: 'tidychat-nav-tip-head' }, '#' + tip.num + (tip.time !== '' ? ' · ' + tip.time : '')),
        React.createElement('div', null, tip.text),
      )
      return React.createElement(React.Fragment, null, rail, tipEl)
    },
  ))

  // 设置卡片（「设置 > 插件配置」里的四个开关，写入 tidychat 命名空间并即时生效）
  const TidychatSettingsCard = () => {
    const [open, setOpen] = React.useState(false)
    const [colorOpen, setColorOpen] = React.useState(false)
    const [reportTags, setReportTags] = React.useState<ReadonlyArray<string>>([])
    const [snap, setSnap] = React.useState<any>(null)
    React.useEffect(() => {
      if (settingsScope === null) { setSnap(null); return }
      const pull = () => { try { setSnap(settingsScope.getSnapshot()) } catch { setSnap(null) } }
      pull()
      let unsub: () => void = () => {}
      try { unsub = settingsScope.subscribe(pull) } catch { unsub = () => {} }
      return () => { try { unsub() } catch { /* ignore */ } }
    }, [])
    const value = (snap !== null && snap !== undefined && snap.value) ? snap.value : { fold: true, divider: true, navigator: true, hideOfficialNav: false, autoLoad: true, navColor: 'auto', navColorCustom: '', navColorLight: 'l3', navAccent: 'auto', navAccentCustom: '', navAccentLight: 'l3', navSide: 'left', navStyle: 'bar', navRing: false, debug: false }
    const writable = snap !== null && snap !== undefined ? snap.writable : false
    const fields: Array<[string, string, string]> = [
      ['fold', '自动折叠已完成轮次', '隐藏思考、工具调用与中间文字，只保留最终结论，控制条含处理时长。'],
      ['divider', '思考↔文字分隔线', '在思考行与正文文字之间插入实线，区分过程与结论。'],
      ['navigator', '左缘定位条', '聊天区左缘的细窄条状导航，悬停显示摘要、点击跳转到对应消息；贴边与样式可在下方调整。'],
      ['hideOfficialNav', '接管官方消息轨', '隐藏 DSH 原生右缘 TurnNavigator（0.1.2+），由本插件定位条接管。注意：是隐藏而非卸载，官方轨仍会挂载；定位条本身关闭时请勿开启，否则将没有任何消息轨。'],
      ['autoLoad', '智能加载更早历史', '在页面空闲时逐步加载更早记录；检测到页面响应下降时自动暂停，以保持长会话流畅。需要时仍可手动继续加载。'],
    ]
    const toggle = (field: string): void => {
      if (settingsScope === null) return
      const cur = value[field] ?? true
      void settingsScope.set(field, !cur).catch(() => {})
    }
    const setColor = (field: string, val: unknown): void => {
      if (settingsScope === null) return
      void settingsScope.set(field, val).catch(() => {})
    }
    const chipRow = (opts: ReadonlyArray<{ key: string; label: string; preview?: string }>, selected: string, onClick: (key: string) => void, disabled: boolean): any =>
      React.createElement('div', { className: 'tidychat-color-chips' },
        opts.map((o) => React.createElement('button', {
          key: o.key,
          type: 'button',
          title: o.label,
          'aria-pressed': selected === o.key,
          className: 'tidychat-nav-color-chip' + (selected === o.key ? ' tidychat-nav-color-chip-on' : ''),
          disabled,
          onClick: () => onClick(o.key),
        },
          o.preview !== undefined ? React.createElement('span', { className: 'tidychat-nav-color-dot', style: { background: o.preview } }) : null,
          o.label,
        )),
      )
    // 调色盘字段：自动 / 自定义（原生取色器无极调色 + HEX/RGB 文本 + 透明度）
    const hex6Of = (rgb: ReadonlyArray<number>): string =>
      '#' + rgb.slice(0, 3).map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('')
    const cssColor = (rgb: ReadonlyArray<number>, a: number): string =>
      a >= 1
        ? hex6Of(rgb)
        : 'rgba(' + Math.round(rgb[0]) + ', ' + Math.round(rgb[1]) + ', ' + Math.round(rgb[2]) + ', ' + (Math.round(a * 1000) / 1000) + ')'
    const colorField = (label: string, modeField: string, customField: string, mode: string, custom: string, autoPreview: string, hint: string): any => {
      const customOn = mode === 'custom'
      const parsed = parseRgba(String(custom ?? ''))
      const rgb: number[] = parsed === null ? [59, 130, 246] : [parsed[0], parsed[1], parsed[2]]
      const alpha = parsed === null ? 1 : parsed[3]
      const swatch = parsed !== null ? cssColor(rgb, alpha) : 'linear-gradient(135deg, #f87171, #60a5fa, #4ade80)'
      return React.createElement('div', { key: modeField, className: 'tidychat-field' },
        React.createElement('div', { className: 'tidychat-field-head' },
          React.createElement('span', { className: 'tidychat-field-label' }, label),
        ),
        React.createElement('div', { className: 'tidychat-color-sub' },
          React.createElement('span', { className: 'tidychat-color-sub-label' }, '模式'),
          chipRow([
            { key: 'auto', label: '自动', preview: autoPreview },
            { key: 'custom', label: '自定义', preview: swatch },
          ], customOn ? 'custom' : 'auto', (k) => setColor(modeField, k), !writable),
        ),
        customOn ? React.createElement('div', { className: 'tidychat-picker' },
          React.createElement('input', {
            type: 'color', className: 'tidychat-color-input', value: hex6Of(rgb), disabled: !writable,
            'aria-label': label + ' 取色',
            onChange: (e: any) => {
              const p = parseRgba(String(e.target.value))
              if (p !== null) setColor(customField, cssColor([p[0], p[1], p[2]], alpha))
            },
          }),
          React.createElement('input', {
            type: 'text', className: 'tidychat-hex-input', value: String(custom ?? ''), disabled: !writable,
            placeholder: '#3b82f6 / rgb(59,130,246)', spellCheck: false,
            'aria-label': label + ' 颜色值',
            onChange: (e: any) => setColor(customField, String(e.target.value)),
          }),
          React.createElement('input', {
            type: 'range', className: 'tidychat-alpha-input', min: 0, max: 100, step: 1,
            value: Math.round(alpha * 100), disabled: !writable,
            'aria-label': label + ' 透明度',
            onChange: (e: any) => setColor(customField, cssColor(rgb, Number(e.target.value) / 100)),
          }),
          React.createElement('span', { className: 'tidychat-alpha-label' }, Math.round(alpha * 100) + '%'),
        ) : null,
        React.createElement('p', { className: 'tidychat-field-hint' }, hint),
      )
    }
    return React.createElement('li', { className: 'tidychat-card' + (open ? ' tidychat-card-open' : '') },
      React.createElement('button', {
        type: 'button',
        className: 'tidychat-card-header',
        'aria-expanded': open,
        onClick: () => setOpen(!open),
      },
        React.createElement('span', { className: 'tidychat-card-headtext' },
          React.createElement('span', { className: 'tidychat-card-name' }, '会话整理tidychat'),
          React.createElement('span', { className: 'tidychat-card-desc' }, '折叠、分隔线、定位条 —— 把长会话整理成可扫读的结论流'),
        ),
        React.createElement('svg', {
          className: 'tidychat-card-chevron' + (open ? ' tidychat-card-chevron-open' : ''),
          viewBox: '0 0 14 14', width: 14, height: 14, fill: 'none',
        },
          React.createElement('path', { d: 'M3.5 5.5L7 9l3.5-3.5', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
        ),
      ),
      open ? React.createElement('div', { className: 'tidychat-card-body' },
        fields.map(([field, label, hint]) => React.createElement('div', { key: field, className: 'tidychat-field' },
          React.createElement('div', { className: 'tidychat-field-head' },
            React.createElement('span', { className: 'tidychat-field-label' }, label),
            React.createElement('button', {
              type: 'button',
              className: 'tidychat-switch' + (value[field] === true ? ' tidychat-switch-on' : ''),
              role: 'switch',
              'aria-checked': value[field] === true,
              disabled: !writable,
              onClick: () => toggle(field),
            }),
          ),
          React.createElement('p', { className: 'tidychat-field-hint' }, hint),
        )),
        React.createElement('div', { key: 'navLayout', className: 'tidychat-field' },
          React.createElement('div', { className: 'tidychat-field-head' },
            React.createElement('span', { className: 'tidychat-field-label' }, '显示位置'),
          ),
          chipRow(NAV_SIDE_OPTIONS, String(value.navSide ?? 'left'), (k) => setColor('navSide', k), !writable),
          React.createElement('div', { className: 'tidychat-field-head', style: { marginTop: '8px' } },
            React.createElement('span', { className: 'tidychat-field-label' }, '显示样式'),
          ),
          chipRow(NAV_STYLE_OPTIONS, String(value.navStyle ?? 'bar'), (k) => setColor('navStyle', k), !writable),
          React.createElement('div', { className: 'tidychat-field-head', style: { marginTop: '8px' } },
            React.createElement('span', { className: 'tidychat-field-label' }, '外圈'),
          ),
          chipRow(NAV_RING_OPTIONS, value.navRing === true ? 'on' : 'off', (k) => setColor('navRing', k === 'on'), !writable),
          React.createElement('p', { className: 'tidychat-field-hint' }, '位置 = 消息轨贴会话区左缘或右缘，右缘时整体镜像（横线模式的强调三角指左、摘要卡从左侧弹出）；样式 = 横线或圆点，圆点模式同样保留悬停鱼眼放大与点击跳转；外圈 = 在当前轮与悬停轮的标记外描一圈强调色（1px、外扩 2px），横线为胶囊形、圆点为正圆环，颜色跟随下方「强调色」。'),
        ),
        React.createElement('div', { key: 'navColors', className: 'tidychat-field' },
          React.createElement('button', {
            type: 'button',
            className: 'tidychat-group-head',
            'aria-expanded': colorOpen,
            onClick: () => setColorOpen(!colorOpen),
          },
            React.createElement('span', { className: 'tidychat-group-title' }, '配色（高级）'),
            React.createElement('span', { className: 'tidychat-group-note' }, '定位条与强调色'),
            React.createElement('svg', {
              className: 'tidychat-card-chevron' + (colorOpen ? ' tidychat-card-chevron-open' : ''),
              viewBox: '0 0 14 14', width: 14, height: 14, fill: 'none',
            },
              React.createElement('path', { d: 'M3.5 5.5L7 9l3.5-3.5', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
            ),
          ),
          colorOpen ? React.createElement('div', { className: 'tidychat-group-body' },
            colorField('定位条默认色', 'navColor', 'navColorCustom', String(value.navColor ?? 'auto'), String(value.navColorCustom ?? ''),
              'linear-gradient(135deg, #222 50%, #f2f2f2 50%)',
              '自动 = 尊重主题：优先用宿主淡色文字色，与背景对比不足时自动换纠偏灰；自定义 = 用取色器无极调色，或直接输入 HEX / RGB。'),
            colorField('强调色（当前 / 悬停回合）', 'navAccent', 'navAccentCustom', String(value.navAccent ?? 'auto'), String(value.navAccentCustom ?? ''),
              'var(--dsw-alias-state-business-primary, #3b82f6)',
              '自动 = 跟随主题品牌色；自定义 = 用取色器无极调色，或直接输入 HEX / RGB。当前轮次与悬停回合以该色高亮。'),
          ) : null,
        ),
        React.createElement('div', { key: 'report', className: 'tidychat-report-field' },
          React.createElement('div', { className: 'tidychat-report-tags-label' }, '现象（可多选）：'),
          React.createElement('div', { className: 'tidychat-report-tags' },
            REPORT_TAGS.map((t) => React.createElement('button', {
              key: t,
              type: 'button',
              className: 'tidychat-report-tag' + (reportTags.includes(t) ? ' tidychat-report-tag-on' : ''),
              onClick: () => setReportTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]),
            }, t)),
          ),
          React.createElement('button', {
            type: 'button',
            className: 'tidychat-report-btn',
            onClick: () => { try { reportAndOpenIssue(reportTags) } catch { /* ignore */ } },
          }, '📤 生成诊断报告并提交'),
          React.createElement('p', { className: 'tidychat-field-hint' }, '勾选现象后点击：自动生成报告（含检测到的异常）并打开 GitHub 新建 issue 页，检查后提交即可。'),
        ),
      ) : null,
    )
  }

  // rc.7 起 settings.plugin.item 改为 keyed 槽（按命名空间键控分发，消费端
  // renderSlot(..., { entryKey: ns })），注册必须用 key 而不是 id；
  // key 值 = 本插件的 settings 命名空间 'tidychat'，与旧版 id 相同。
  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register(
    { name: 'settings.plugin.item', key: 'tidychat', order: 100, inject: () => ({}) },
    TidychatSettingsCard,
  ))
}
