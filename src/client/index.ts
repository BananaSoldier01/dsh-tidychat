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
[data-tidychat-divider-block] {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 14px 8px 8px 8px;
}
.tidychat-ctl-label {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary, #999);
  white-space: nowrap;
  flex: none;
}
.tidychat-ctl-line {
  flex: 1;
  border-top: 1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.55));
}
.tidychat-ctl-btn {
  font-size: 11px;
  cursor: pointer;
  border: 1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.4));
  background: transparent;
  color: var(--dsw-alias-label-secondary, #666);
  border-radius: 6px;
  padding: 1px 8px;
  flex: none;
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
.tidychat-nav-tip {
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
  color: var(--dsw-alias-label-primary, #222);
}
.tidychat-nav-tip-head {
  color: var(--dsw-alias-label-tertiary, #999);
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

export function apply(ctx: any): void {
  ctx.effect(() => injectStyle(CSS))

  const listeners: Array<() => void> = []
  const notify = () => { for (const fn of listeners) fn() }
  const foldState = new Map<number, boolean>()

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

  // 设置：tidychat 命名空间，四个开关 + 定位条配色（默认色 auto 自适应 + 强调色 blue/l3）；读不到 settings 服务时全开。
  const config = { fold: true, divider: true, navigator: true, autoLoad: true, navColor: 'auto', navColorLight: 'l3', navAccent: 'blue', navAccentLight: 'l3' }
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

    // 1) 行内思考↔文字分隔线（独立开关 divider）
    if (config.divider) {
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

    // 2) 折叠（独立开关 fold，含 turn 分组 + 控制条 + 上下文注入行隐藏）
    if (config.fold) {
      let currentTurn: any = null
      let pendingLeads: Element[] = []
      const turns: any[] = []
      for (const row of all) {
        const anchor = row.getAttribute('data-chat-anchor-key') || ''
        const kind = row.getAttribute('data-chat-flow-kind') || 'null'
        const m = /^14:assistant-step(\d+):/.exec(anchor)
        if (m !== null) {
          const t = Number(m[1])
          if (currentTurn === null || currentTurn.turn !== t) {
            currentTurn = { turn: t, steps: [] as Element[], toolCalls: 0, hasTail: false, rows: [] as Element[], timing: '' }
            for (const lead of pendingLeads) currentTurn.rows.push(lead)
            pendingLeads = []
            turns.push(currentTurn)
          }
          currentTurn.steps.push(row)
          currentTurn.rows.push(row)
        } else if (anchor.indexOf('9:tool-call') === 0) {
          if (currentTurn !== null) { currentTurn.toolCalls += 1; currentTurn.rows.push(row) }
        } else if (anchor.indexOf('9:turn-tail') === 0) {
          if (currentTurn !== null) { currentTurn.hasTail = true; currentTurn.timing = cleanTiming(row.textContent || '') }
        } else if (kind === 'user') {
          currentTurn = null
          pendingLeads = []
        } else if (kind === 'context') {
          pendingLeads.push(row)
        }
      }

      const coveredRows = new Set<Element>()
      for (const turn of turns) {
        if (!turn.hasTail) continue
        let finalRow: Element | null = null
        for (let i = turn.steps.length - 1; i >= 0; i--) {
          if (hasTextInStep(turn.steps[i])) { finalRow = turn.steps[i]; break }
        }
        const processRows: Element[] = []
        if (finalRow === null) {
          for (const row of turn.rows) processRows.push(row)
        } else {
          for (const row of turn.rows) {
            if (row === finalRow) break
            processRows.push(row)
          }
        }
        const finalThink = finalRow === null ? null : finalRow.querySelector('[data-variant="think"]')
        if (processRows.length === 0 && finalThink === null) continue
        for (const row of processRows) coveredRows.add(row)
        const firstRow = turn.rows[0]
        if (firstRow === undefined || firstRow.parentElement === null) continue

        let ctl: HTMLElement | null = null
        const prev = firstRow.previousElementSibling as HTMLElement | null
        if (prev !== null && prev.hasAttribute && prev.hasAttribute('data-tidychat-divider-block') && prev.getAttribute('data-tidychat-turn') === String(turn.turn)) {
          ctl = prev
        } else {
          ctl = document.createElement('div')
          ctl.setAttribute('data-tidychat-divider-block', '1')
          ctl.setAttribute('data-tidychat-turn', String(turn.turn))
          ctl.setAttribute('role', 'separator')
          const label = document.createElement('span')
          label.className = 'tidychat-ctl-label'
          const line = document.createElement('div')
          line.className = 'tidychat-ctl-line'
          const btn = document.createElement('button')
          btn.className = 'tidychat-ctl-btn'
          btn.setAttribute('type', 'button')
          ctl.appendChild(label)
          ctl.appendChild(line)
          ctl.appendChild(btn)
          btn.addEventListener('click', () => {
            const cur = foldState.get(turn.turn) ?? true
            applyFold(turn, processRows, finalThink, ctl, !cur)
          })
          firstRow.parentElement!.insertBefore(ctl, firstRow)
        }
        const folded = foldState.get(turn.turn) ?? true
        applyFold(turn, processRows, finalThink, ctl, folded)
        if (folded) foldedCount += 1
      }

      // 未覆盖的上下文注入行强制隐藏
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

  const applyFold = (turn: any, processRows: Element[], finalThink: Element | null, ctl: HTMLElement | null, folded: boolean): void => {
    foldState.set(turn.turn, folded)
    for (const row of processRows) {
      if (folded) row.setAttribute('data-tidychat-folded', '1')
      else row.removeAttribute('data-tidychat-folded')
    }
    if (finalThink !== null) {
      if (folded) finalThink.setAttribute('data-tidychat-folded-inline', '1')
      else finalThink.removeAttribute('data-tidychat-folded-inline')
    }
    if (ctl !== null) {
      const label = ctl.querySelector('.tidychat-ctl-label')
      const btn = ctl.querySelector('.tidychat-ctl-btn')
      const thinkCount = processRows.filter((r) => (r.getAttribute('data-chat-anchor-key') || '').indexOf('14:assistant-step') === 0).length + (finalThink !== null ? 1 : 0)
      const totalSteps = thinkCount + turn.toolCalls
      const parts = [folded ? ('过程 ' + totalSteps + ' 步') : ('已展开 ' + totalSteps + ' 步')]
      if (turn.timing !== '') parts.push(turn.timing)
      const labelText = parts.join(' · ')
      const btnText = folded ? '展开' : '收起'
      // 只在文案真正变化时才写入，避免相同 textContent 反复触发 DOM mutation
      if (label !== null && label.textContent !== labelText) label.textContent = labelText
      if (btn !== null && btn.textContent !== btnText) btn.textContent = btnText
    }
  }

  const findScrollContainer = (): Element | null => document.querySelector('[data-conversation-scroll]')

  // DOM 查询统一收口到会话容器：容器存在只看容器，未挂载才回退 document（防 hero/空会话态失效）。
  const scopedRows = (selector: string): Element[] => {
    const container = findScrollContainer()
    return Array.from((container ?? document).querySelectorAll<Element>(selector))
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
  // 异常检测（报告正文「系统检测」段与标题共用）
  const detectIssues = (): string[] => {
    const st = activeSessionId !== null ? governor.get(activeSessionId) : undefined
    const issues: string[] = []
    if (peakScanMs >= SOFT_BUDGET_MS) issues.push(`扫描峰值 ${Math.round(peakScanMs)}ms（≥${SOFT_BUDGET_MS}ms 预算），可能存在卡顿迹象`)
    if (st?.status === 'paused') issues.push('自动加载已暂停（性能闸门触发）')
    if (!config.autoLoad) issues.push('自动加载已关闭，历史窗口偏小')
    if (config.autoLoad && findLoadOlderButton() !== null && st?.status === 'idle') issues.push('自动加载开启但未在加载，且仍有更早历史未加载')
    return issues
  }
  const buildReport = (tags: ReadonlyArray<string>, issues: ReadonlyArray<string>): string => {
    const st = activeSessionId !== null ? governor.get(activeSessionId) : undefined
    const rows = scopedRows('[data-chat-anchor-key]')
    const turns = rows.filter((r) => r.getAttribute('data-chat-flow-kind') === 'user').length
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
      `- 已渲染/总数：${turns}/${turns}`,
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
  const parseRgb = (s: string): [number, number, number] | null => {
    const m = /rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s]+([\d.]+))?\)/.exec(s)
    if (m !== null) {
      const alpha = m[4] !== undefined ? Number(m[4]) : 1
      if (alpha === 0) return null // 全透明视为无背景，向祖先冒泡
      return [Number(m[1]), Number(m[2]), Number(m[3])]
    }
    const h = /^#([0-9a-f]{6})$/i.exec(s.trim())
    if (h !== null) {
      const n = parseInt(h[1], 16)
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    }
    return null
  }
  // 识别「定位条背后的深浅」：从会话滚动容器向上冒泡找第一个不透明背景，按感知亮度判定。
  const isDarkBackground = (): boolean => {
    try {
      const candidates: Element[] = []
      const container = findScrollContainer()
      if (container !== null) candidates.push(container)
      candidates.push(document.body, document.documentElement)
      for (const el of candidates) {
        const rgb = parseRgb(getComputedStyle(el).backgroundColor)
        if (rgb !== null) {
          return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] < 128
        }
      }
    } catch { /* 忽略，走兜底 */ }
    try {
      if (typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches) return true
    } catch { /* 忽略 */ }
    return false
  }
  const resolveNavColors = (): { bar: string; hot: string } => {
    const cs = getComputedStyle(document.documentElement)
    const brand = cs.getPropertyValue('--dsw-alias-state-business-primary').trim() || '#3b82f6'
    // 默认色：auto → 按背景明暗取对比灰（深背景淡灰 / 浅背景深灰）；否则按色系×明度查表
    let bar: string
    if ((config.navColor ?? 'auto') === 'auto') {
      bar = isDarkBackground() ? 'rgba(226,226,226,0.85)' : 'rgba(80,80,80,0.78)'
    } else {
      bar = hueColor(config.navColor, config.navColorLight, 'rgba(128,128,128,0.8)')
    }
    // 强调色：当前轮次 / 悬停导航目标回合的高亮色，按色系×明度查表，缺省回退品牌色
    const hot = hueColor(config.navAccent, config.navAccentLight, brand)
    return { bar, hot }
  }
  // 写入供 canvas 读取的 CSS 变量（值相同不重复写，避免触发主题观察器死循环）
  const applyNavColors = (): void => {
    const { bar, hot } = resolveNavColors()
    const root = document.documentElement
    if (root.style.getPropertyValue('--tidychat-nav-color') !== bar) root.style.setProperty('--tidychat-nav-color', bar)
    if (root.style.getPropertyValue('--tidychat-nav-color-hot') !== hot) root.style.setProperty('--tidychat-nav-color-hot', hot)
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
          config.autoLoad = snap.value.autoLoad ?? true
          config.navColor = typeof snap.value.navColor === 'string' ? snap.value.navColor : 'auto'
          config.navColorLight = typeof snap.value.navColorLight === 'string' ? snap.value.navColorLight : 'l3'
          config.navAccent = typeof snap.value.navAccent === 'string' ? snap.value.navAccent : 'blue'
          config.navAccentLight = typeof snap.value.navAccentLight === 'string' ? snap.value.navAccentLight : 'l3'
        }
      } catch { /* keep defaults */ }
    }
    readConfig()
    applyNavColors()
    ctx.effect(() => {
      let unsub: () => void = () => {}
      try {
        unsub = settingsScope.subscribe(() => {
          readConfig()
          applyNavColors()
          scan()
          if (config.autoLoad && activeSessionId !== null) scheduleNext(activeSessionId)
        })
      } catch { /* ignore */ }
      return () => { try { unsub() } catch { /* ignore */ } }
    })
  }

  scan()
  applyNavColors()

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
    mainObserver = new MutationObserver(() => {
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
    return () => themeObs.disconnect()
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

  // 定位条横向占用：rail padding 2px + slot padding 6px×2 + 竖条最宽 30px ≈ 44px，留 4px 余量
  const NAV_RAIL_WIDTH = 48

  const measurePos = (): { left: number; top: number; gutter: number } | null => {
    // 新版 DSH 里 [data-slot="conversation.session"] 是 0×0 的空壳元素（slot host 未参与布局），
    // 用它测 rect 必然返回 null，导致定位条永远落到写死的 fallback。
    // 改用真实会话滚动容器 [data-conversation-scroll] 作为锚点，贴住会话区实际左缘。
    const host = document.querySelector('[data-conversation-scroll]')
    if (host === null) return null
    const r = host.getBoundingClientRect()
    if (r.width < 10 || r.height < 10) return null
    // 会话内容居中且 max-width 748px：宽窗口时左右有留白，窄窗口时内容铺满、左侧留白归零，
    // 定位条会压到正文/输入框。测内容真实左缘与容器左缘的间距（gutter），不足定位条宽度即隐藏。
    const content = scopedRows('[data-composer-card]')[0] ?? scopedRows('[data-chat-anchor-key]')[0]
    const gutter = content !== null ? Math.max(0, content.getBoundingClientRect().left - r.left) : r.width
    return { left: r.left, top: r.top + r.height * 0.5, gutter }
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

  // 轨道高度自适应：turn 少时按 12px/轮 收紧（不用最大高度），turn 多时封顶 min(70vh, 660px)
  const railHeight = (n: number): number => Math.min(Math.min(window.innerHeight * 0.7, 660), Math.max(NAV_RAIL_MIN_HEIGHT, n * NAV_RAIL_TURN_SPACING))

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
      // 行位置缓存：scroll 无关的内容坐标（相对滚动容器），供「当前 turn 检测 + 跳转」二分。
      // scrollH 记录缓存构建时的容器内容高度——折叠/加载会改变布局（行数可能不变但位置变），用它判定重算。
      const rowCacheRef = React.useRef<{ rows: Element[]; tops: number[]; count: number; scrollH: number }>({ rows: [], tops: [], count: -1, scrollH: -1 })

      const userRows = (): Element[] => scopedRows('[data-chat-anchor-key]').filter((r) => r.getAttribute('data-chat-flow-kind') === 'user')
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
        const n = users.length
        if (n === 0) return
        const H = railHeight(users.length)
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
        const positions = layoutPositions(n, hover, H)
        const nearest = (i: number): boolean => hover !== null && Math.abs(i - hover) <= 2
        for (let i = 0; i < n; i++) {
          const y = positions[i]
          const isCurrent = current === i
          const isHover = hover === i
          const len = isHover ? NAV_RAIL_BAR_LEN_NEAR : (isCurrent ? NAV_RAIL_BAR_LEN_CURRENT : (nearest(i) ? NAV_RAIL_BAR_LEN + 4 : NAV_RAIL_BAR_LEN))
          const color = isCurrent || isHover ? hotColor : barColor
          ctx.fillStyle = color
          ctx.fillRect(0, y - NAV_RAIL_BAR_H / 2, len, NAV_RAIL_BAR_H)
          // 当前 turn 右侧加个小指针
          if (isCurrent) {
            ctx.fillStyle = hotColor
            ctx.beginPath()
            ctx.moveTo(len + 2, y)
            ctx.lineTo(len + 6, y - 3)
            ctx.lineTo(len + 6, y + 3)
            ctx.closePath()
            ctx.fill()
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
        if (binding === undefined || binding.session === undefined) return
        const face = binding.session
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
        // 滚动监听：检测「阅读区顶部」的当前 turn（rAF 节流）
        let scrollRaf = 0
        const onScroll = (): void => {
          if (scrollRaf !== 0) return
          scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; detectCurrent() })
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
        }
      }, [props.sessionId])

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

      // 每轮渲染后：行数或内容高度变化（折叠/加载）→ 重建行缓存 → 检测当前 turn → 重绘 canvas
      React.useEffect(() => {
        const container = findScrollContainer()
        const scrollH = container !== null ? container.scrollHeight : 0
        if (rowCacheRef.current.count !== users.length || rowCacheRef.current.scrollH !== scrollH) {
          rebuildRowCache(users.length, scrollH)
        }
        detectCurrent()
        redraw()
      })

      const jumpTo = (index: number): void => {
        const target = rowCacheRef.current.rows[index]
        if (target === undefined) return
        const container = findScrollContainer()
        if (container === null) return
        const cRect = container.getBoundingClientRect()
        const tRect = target.getBoundingClientRect()
        // 用户消息出现在阅读区顶部（header 之下），而非 viewport 中心或埋进 header
        container.scrollTo({ top: (tRect.top - cRect.top) + container.scrollTop - HEADER_OFFSET, behavior: 'smooth' })
      }
      const handlePointerMove = (ev: React.PointerEvent<HTMLCanvasElement>): void => {
        const canvas = canvasRef.current
        if (canvas === null) return
        const rect = canvas.getBoundingClientRect()
        const idx = indexFromY(ev.clientY - rect.top, layoutPositions(users.length, hover, railHeight(users.length)))
        if (idx !== hover) setHover(idx)
        const u = users[idx]
        if (u !== undefined) setTip({ x: ev.clientX + 18, y: ev.clientY - 8, num: idx + 1, time: u.time !== undefined && u.time !== null ? hhmm(u.time) : '', text: u.summary })
      }
      const handlePointerLeave = (): void => { setHover(null); setTip(null) }
      const handlePointerDown = (ev: React.PointerEvent<HTMLCanvasElement>): void => {
        try { ev.currentTarget.setPointerCapture(ev.pointerId) } catch { /* 老浏览器忽略 */ }
      }
      const handlePointerUp = (ev: React.PointerEvent<HTMLCanvasElement>): void => {
        const canvas = canvasRef.current
        if (canvas !== null) {
          const rect = canvas.getBoundingClientRect()
          const idx = indexFromY(ev.clientY - rect.top, layoutPositions(users.length, hover, railHeight(users.length)))
          jumpTo(idx)
        }
        try { ev.currentTarget.releasePointerCapture(ev.pointerId) } catch { /* 忽略 */ }
        setHover(null)
        setTip(null)
      }

      if (!enabled) return null
      // 会话内容左侧留白不足以容纳定位条时隐藏（Codex 同款「空间足够才显示」）
      if (pos !== null && pos.gutter < NAV_RAIL_WIDTH) return null
      if (users.length === 0) return null
      const style = pos === null
        ? { left: '280px', top: '50vh' }
        : { left: pos.left + 'px', top: pos.top + 'px' }
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
        style: { left: tip.x + 'px', top: tip.y + 'px' },
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
    const value = (snap !== null && snap !== undefined && snap.value) ? snap.value : { fold: true, divider: true, navigator: true, autoLoad: true, navColor: 'auto', navColorLight: 'l3', navAccent: 'blue', navAccentLight: 'l3', debug: false }
    const writable = snap !== null && snap !== undefined ? snap.writable : false
    const fields: Array<[string, string, string]> = [
      ['fold', '自动折叠已完成轮次', '隐藏思考、工具调用与中间文字，只保留最终结论，控制条含处理时长。'],
      ['divider', '思考↔文字分隔线', '在思考行与正文文字之间插入实线，区分过程与结论。'],
      ['navigator', '左缘定位条', '聊天区左缘的细窄条状导航，悬停显示摘要、点击跳转到对应消息。'],
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
    const AUTO_OPT: { key: string; label: string; preview: string } = { key: 'auto', label: '自动', preview: 'linear-gradient(135deg, #222 50%, #f2f2f2 50%)' }
    return React.createElement('li', { className: 'tidychat-card' + (open ? ' tidychat-card-open' : '') },
      React.createElement('button', {
        type: 'button',
        className: 'tidychat-card-header',
        'aria-expanded': open,
        onClick: () => setOpen(!open),
      },
        React.createElement('span', { className: 'tidychat-card-headtext' },
          React.createElement('span', { className: 'tidychat-card-name' }, '会话整理'),
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
        React.createElement('div', { key: 'navColor', className: 'tidychat-field' },
          React.createElement('div', { className: 'tidychat-field-head' },
            React.createElement('span', { className: 'tidychat-field-label' }, '定位条默认色'),
          ),
          React.createElement('div', { className: 'tidychat-color-sub' },
            React.createElement('span', { className: 'tidychat-color-sub-label' }, '色系'),
            chipRow([AUTO_OPT, ...NAV_HUE_OPTIONS], String(value.navColor ?? 'auto'), (k) => setColor('navColor', k), !writable),
          ),
          React.createElement('div', { className: 'tidychat-color-sub' },
            React.createElement('span', { className: 'tidychat-color-sub-label' }, '明度'),
            chipRow(NAV_LIGHT_OPTIONS, String(value.navColorLight ?? 'l3'), (k) => setColor('navColorLight', k), !writable || (value.navColor ?? 'auto') === 'auto'),
          ),
          React.createElement('p', { className: 'tidychat-field-hint' }, '自动 = 跟随聊天区背景明暗自动选择对比灰；手动 = 按「色系 × 5 级明度（极浅→极深）」正交着色。'),
        ),
        React.createElement('div', { key: 'navAccent', className: 'tidychat-field' },
          React.createElement('div', { className: 'tidychat-field-head' },
            React.createElement('span', { className: 'tidychat-field-label' }, '强调色（当前 / 悬停回合）'),
          ),
          React.createElement('div', { className: 'tidychat-color-sub' },
            React.createElement('span', { className: 'tidychat-color-sub-label' }, '色系'),
            chipRow(NAV_HUE_OPTIONS, String(value.navAccent ?? 'blue'), (k) => setColor('navAccent', k), !writable),
          ),
          React.createElement('div', { className: 'tidychat-color-sub' },
            React.createElement('span', { className: 'tidychat-color-sub-label' }, '明度'),
            chipRow(NAV_LIGHT_OPTIONS, String(value.navAccentLight ?? 'l3'), (k) => setColor('navAccentLight', k), !writable),
          ),
          React.createElement('p', { className: 'tidychat-field-hint' }, '当前轮次与悬停 / 导航目标回合以强调色高亮；普通条幅用默认色。'),
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
