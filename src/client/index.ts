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
.tidychat-nav-slot {
  display: flex;
  align-items: center;
  height: 18px;
  margin: 1px 0;
  padding: 0 6px;
  cursor: pointer;
  background: transparent; /* 旧浏览器兜底：color-mix 不支持时退回无底衬 */
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-3, #fff) 74%, transparent);
  border: none;
  border-radius: 6px;
}
.tidychat-nav-slot:hover {
  background: transparent; /* 旧浏览器兜底 */
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-3, #fff) 96%, transparent);
}
.tidychat-nav-bar {
  display: block;
  height: 3px;
  border-radius: 2px;
  background: var(--dsw-alias-label-caption, rgba(127, 127, 127, 0.5)); /* 旧浏览器兜底：保证竖条有颜色 */
  background: color-mix(in srgb, var(--dsw-alias-label-primary, #222) 78%, transparent);
  transition: width 120ms ease, background 120ms ease;
}
.tidychat-nav-bar.hot {
  background: var(--dsw-alias-state-business-primary, #3b82f6);
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

  // 设置：tidychat 命名空间，四个开关；读不到 settings 服务时全开。
  const config = { fold: true, divider: true, navigator: true, autoLoad: true }
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
    dirty = false
  }

  // ===== 可观测性（debug 模式性能报告）=====
  const debugEnabled = (): boolean => {
    try { return localStorage.getItem('dsh-tidychat-debug') === '1' || (window as any).__tidychatDebug === true } catch { return false }
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
        }
      } catch { /* keep defaults */ }
    }
    readConfig()
    ctx.effect(() => {
      let unsub: () => void = () => {}
      try {
        unsub = settingsScope.subscribe(() => {
          readConfig()
          scan()
          if (config.autoLoad && activeSessionId !== null) scheduleNext(activeSessionId)
        })
      } catch { /* ignore */ }
      return () => { try { unsub() } catch { /* ignore */ } }
    })
  }

  scan()

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

  ctx.effect(() => {
    rebindMainObserver()
    const intervalId = setInterval(() => { rebindMainObserver(); if (!isGovernorBusy() && dirty) scan() }, 5000)
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

  const findScrollParent = (el: Element): HTMLElement | null => {
    let p = el.parentElement
    while (p !== null) {
      if (p.scrollHeight > p.clientHeight + 4) return p
      p = p.parentElement
    }
    return null
  }

  // 导航条（挂到会话头部 utilities 槽，fixed 定位到聊天区左缘；独立开关 navigator）
  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register(
    { name: 'conversation.session.header.utilities', id: 'tidychat-nav' },
    (props: any) => {
      const [pos, setPos] = React.useState<{ left: number; top: number; gutter: number } | null>(null)
      const [snapshot, setSnapshot] = React.useState<any>(null)
      const [tip, setTip] = React.useState<any>(null)
      const [hover, setHover] = React.useState<number | null>(null)
      const [enabled, setEnabled] = React.useState<boolean>(config.navigator)

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
        return () => {
          try { unsub() } catch { /* ignore */ }
          const i = listeners.indexOf(refresh)
          if (i >= 0) listeners.splice(i, 1)
          resizeObs?.disconnect()
          window.removeEventListener('resize', refresh)
        }
      }, [props.sessionId])

      if (!enabled) return null
      // 会话内容左侧留白不足以容纳定位条时隐藏（Codex 同款「空间足够才显示」）
      if (pos !== null && pos.gutter < NAV_RAIL_WIDTH) return null

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

      const jumpTo = (index: number): void => {
        const domUsers = scopedRows('[data-chat-anchor-key]').filter((r) => r.getAttribute('data-chat-flow-kind') === 'user')
        const target = domUsers[index]
        if (target !== undefined) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        } else if (domUsers.length > 0) {
          const scroller = findScrollParent(domUsers[0])
          if (scroller !== null) scroller.scrollTop = 0
        }
      }

      const barWidth = (i: number): number => {
        if (hover === null) return 16
        const d = Math.abs(i - hover)
        if (d === 0) return 30
        if (d === 1) return 22
        if (d === 2) return 18
        return 16
      }

      if (users.length === 0) return null
      const style = pos === null
        ? { left: '280px', top: '50vh' }
        : { left: pos.left + 'px', top: pos.top + 'px' }
      const rail = React.createElement('div', {
        className: 'tidychat-nav-rail',
        style: Object.assign({ transform: 'translateY(-50%)' }, style),
        'aria-label': '用户消息定位',
      }, users.map((u, i) => {
        const hot = hover === i
        return React.createElement('button', {
          key: i,
          className: 'tidychat-nav-slot',
          onClick: () => jumpTo(i),
          onMouseEnter: (ev: any) => {
            setHover(i)
            setTip({ x: ev.clientX + 18, y: ev.clientY - 8, num: i + 1, time: u.time !== undefined && u.time !== null ? hhmm(u.time) : '', text: u.summary })
          },
          onMouseMove: (ev: any) => setTip((prev: any) => prev === null ? null : Object.assign({}, prev, { x: ev.clientX + 18, y: ev.clientY - 8 })),
          onMouseLeave: () => { setHover(null); setTip(null) },
        }, React.createElement('span', {
          className: 'tidychat-nav-bar' + (hot ? ' hot' : ''),
          style: { width: barWidth(i) + 'px' },
        }))
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
    const [snap, setSnap] = React.useState<any>(null)
    React.useEffect(() => {
      if (settingsScope === null) { setSnap(null); return }
      const pull = () => { try { setSnap(settingsScope.getSnapshot()) } catch { setSnap(null) } }
      pull()
      let unsub: () => void = () => {}
      try { unsub = settingsScope.subscribe(pull) } catch { unsub = () => {} }
      return () => { try { unsub() } catch { /* ignore */ } }
    }, [])
    const value = (snap !== null && snap !== undefined && snap.value) ? snap.value : { fold: true, divider: true, navigator: true, autoLoad: true }
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
