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
[data-tidychat-folded], [data-tidychat-folded-inline] {
  display: none !important;
}
.tidychat-nav-rail {
  position: fixed;
  z-index: 40;
  display: flex;
  flex-direction: column;
  padding: 6px 0;
}
.tidychat-nav-slot {
  display: flex;
  align-items: center;
  height: 18px;
  width: 34px;
  cursor: pointer;
  background: transparent;
  border: none;
  padding: 0;
}
.tidychat-nav-bar {
  display: block;
  height: 3px;
  border-radius: 2px;
  background: var(--dsw-alias-label-caption, rgba(127,127,127,0.5));
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
  background: var(--dsw-alias-bg-elevated, #fff);
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
  let autoLoadCount = 0
  let autoLoadBusy = false

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
    const all = Array.from(document.querySelectorAll('[data-chat-anchor-key]'))

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
      if (label !== null) label.textContent = parts.join(' · ')
      if (btn !== null) btn.textContent = folded ? '展开' : '收起'
    }
  }

  const autoLoadOlder = (): boolean => {
    if (!config.autoLoad) return false
    if (autoLoadBusy || autoLoadCount > 60) return false
    const buttons = Array.from(document.querySelectorAll('button'))
    const btn = buttons.find((b) => {
      const t = (b.textContent || '').trim()
      return t === '加载更早' || t === '加载更多' || t.indexOf('Load older') === 0 || t.indexOf('Load more') === 0
    })
    if (btn === undefined || btn.disabled) return false
    autoLoadBusy = true
    autoLoadCount += 1
    try { btn.click() } catch { /* ignore */ }
    setTimeout(() => { autoLoadBusy = false }, 1200)
    return true
  }

  const scan = (): void => {
    try {
      applySurgery()
      autoLoadOlder()
      notify()
    } catch (err) {
      console.error('[dsh-tidychat] 扫描出错', err)
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
          config.autoLoad = snap.value.autoLoad ?? true
        }
      } catch { /* keep defaults */ }
    }
    readConfig()
    try { settingsScope.subscribe(() => { readConfig(); scan() }) } catch { /* ignore */ }
  }

  scan()

  ctx.effect(() => {
    let pending: ReturnType<typeof setTimeout> | null = null
    const obs = new MutationObserver(() => {
      if (pending !== null) return
      pending = setTimeout(() => { pending = null; scan() }, 250)
    })
    obs.observe(document.body, { childList: true, subtree: true })
    const intervalId = setInterval(() => { scan() }, 5000)
    return () => {
      obs.disconnect()
      clearInterval(intervalId)
      if (pending !== null) clearTimeout(pending)
    }
  })

  const measurePos = (): { left: number; top: number } | null => {
    const host = document.querySelector('[data-slot="conversation.session"]')
    if (host === null) return null
    const r = host.getBoundingClientRect()
    if (r.width < 10 || r.height < 10) return null
    return { left: r.left + 4, top: r.top + r.height * 0.5 }
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
      const [pos, setPos] = React.useState<{ left: number; top: number } | null>(null)
      const [snapshot, setSnapshot] = React.useState<any>(null)
      const [tip, setTip] = React.useState<any>(null)
      const [hover, setHover] = React.useState<number | null>(null)
      const [enabled, setEnabled] = React.useState<boolean>(config.navigator)

      React.useEffect(() => {
        const sid = props.sessionId
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
        return () => {
          try { unsub() } catch { /* ignore */ }
          const i = listeners.indexOf(refresh)
          if (i >= 0) listeners.splice(i, 1)
        }
      }, [props.sessionId])

      if (!enabled) return null

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
        const domUsers = Array.from(document.querySelectorAll('[data-chat-anchor-key]')).filter((r) => r.getAttribute('data-chat-flow-kind') === 'user')
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
        ? { left: '284px', top: '50vh' }
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
      ['autoLoad', '自动加载更早历史', '发现「加载更早」按钮时自动点击，把全部历史纳入折叠与导航。'],
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

  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register(
    { name: 'settings.plugin.item', id: 'tidychat', order: 100, inject: () => ({}) },
    TidychatSettingsCard,
  ))
}
