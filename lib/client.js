window.__ModuleLoader__.load({ id: "@bananasoldier01/dsh-tidychat", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") {
		for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) {
				__defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
		}
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let react = require("react");
react = __toESM(react, 1);

//#region src/client/index.ts
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
const inject = ["slots", "sessions"];
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
  color: var(--dsw-alias-label-secondary, #666);
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
  color: var(--dsw-alias-label-primary, #222);
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
  color: var(--tidychat-nav-tip-text, var(--dsw-alias-label-primary, #222));
}
.tidychat-nav-tip-head {
  color: var(--tidychat-nav-tip-head, var(--dsw-alias-label-secondary, #666));
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
`;
function injectStyle(css) {
	const tag = document.createElement("style");
	tag.setAttribute("data-plugin-css", "dsh-tidychat");
	tag.textContent = css;
	document.head.appendChild(tag);
	return () => {
		tag.remove();
	};
}
const REPORT_TAGS = [
	"滚动卡顿",
	"输入卡顿",
	"界面卡顿",
	"定位条异常",
	"自动加载异常",
	"折叠异常"
];
const NAV_HUE_OPTIONS = [
	{
		key: "gray",
		label: "灰",
		preview: "#9e9e9e"
	},
	{
		key: "black",
		label: "黑",
		preview: "#111111"
	},
	{
		key: "white",
		label: "白",
		preview: "#f5f5f5"
	},
	{
		key: "blue",
		label: "蓝",
		preview: "#3b82f6"
	},
	{
		key: "violet",
		label: "紫",
		preview: "#8b5cf6"
	},
	{
		key: "cyan",
		label: "青",
		preview: "#06b6d4"
	},
	{
		key: "green",
		label: "绿",
		preview: "#22c55e"
	},
	{
		key: "orange",
		label: "橙",
		preview: "#f97316"
	},
	{
		key: "red",
		label: "红",
		preview: "#ef4444"
	}
];
const NAV_LIGHT_OPTIONS = [
	{
		key: "l1",
		label: "极浅"
	},
	{
		key: "l2",
		label: "浅"
	},
	{
		key: "l3",
		label: "中"
	},
	{
		key: "l4",
		label: "深"
	},
	{
		key: "l5",
		label: "极深"
	}
];
function apply(ctx) {
	ctx.effect(() => injectStyle(CSS));
	const listeners = [];
	const notify = () => {
		for (const fn of listeners) fn();
	};
	const foldState = /* @__PURE__ */ new Map();
	const SOFT_BUDGET_MS = 30;
	const HARD_BUDGET_MS = 50;
	const CONSECUTIVE_SLOW_LIMIT = 3;
	const SETTLE_QUIET_MS = 300;
	const SETTLE_TIMEOUT_MS = 8e3;
	const IDLE_FALLBACK_MS = 50;
	const NULL_RETRY_LIMIT = 15;
	const NULL_RETRY_DELAY_MS = 2e3;
	const governor = /* @__PURE__ */ new Map();
	let activeSessionId = null;
	const isGovernorBusy = () => {
		if (activeSessionId === null) return false;
		const st = governor.get(activeSessionId);
		return st !== void 0 && (st.status === "loading" || st.status === "settling");
	};
	let lastScanMs = 0;
	let peakScanMs = 0;
	let scanCount = 0;
	let dirty = false;
	const disposers = [];
	ctx.effect(() => () => {
		for (const d of disposers.splice(0)) try {
			d();
		} catch {}
	});
	/** 登记一次性资源；资源自然结束时调用返回的 off() 摘除，避免登记表无限增长。 */
	const track = (dispose) => {
		disposers.push(dispose);
		return () => {
			const i = disposers.indexOf(dispose);
			if (i >= 0) disposers.splice(i, 1);
		};
	};
	const config = {
		fold: true,
		divider: true,
		navigator: true,
		autoLoad: true,
		navColor: "auto",
		navColorLight: "l3",
		navAccent: "auto",
		navAccentLight: "l3"
	};
	let settingsScope = null;
	const settingsFace = ctx.get("webUiSettings") ?? ctx.get("settingsScope");
	if (settingsFace !== void 0 && typeof settingsFace.bind === "function") try {
		settingsScope = settingsFace.bind({ namespace: "tidychat" });
	} catch {
		settingsScope = null;
	}
	const cleanTiming = (raw) => {
		if (typeof raw !== "string" || raw === "") return "";
		const yongshi = raw.indexOf("用时");
		if (yongshi === -1) return "";
		const times = raw.slice(0, yongshi).match(/\d{1,2}:\d{2}/g);
		const lead = times !== null && times.length > 0 ? times[times.length - 1] : "";
		const rest = raw.slice(yongshi);
		const tok = rest.indexOf("tok/s");
		const body = tok === -1 ? rest.slice(0, 50) : rest.slice(0, tok + 5);
		return (lead !== "" ? lead + " · " : "") + body;
	};
	const hasTextInStep = (row) => {
		const think = row.querySelector("[data-variant=\"think\"]");
		if (think === null) return true;
		let sib = think.nextElementSibling;
		while (sib !== null && sib.hasAttribute && sib.hasAttribute("data-tidychat-divider")) sib = sib.nextElementSibling;
		return sib !== null;
	};
	const applySurgery = () => {
		let inline = 0;
		let foldedCount = 0;
		let hiddenContext = 0;
		const all = scopedRows("[data-chat-anchor-key]");
		if (config.divider) for (const row of all) {
			if ((row.getAttribute("data-chat-anchor-key") || "").indexOf("14:assistant-step") !== 0) continue;
			if (row.querySelector("[data-tidychat-divider]") !== null) continue;
			const think = row.querySelector("[data-variant=\"think\"]");
			if (think === null || think.parentElement === null) continue;
			let next = think.nextElementSibling;
			while (next !== null && next.hasAttribute && next.hasAttribute("data-tidychat-divider")) next = next.nextElementSibling;
			if (next === null) continue;
			const divider = document.createElement("div");
			divider.setAttribute("data-tidychat-divider", "1");
			divider.setAttribute("role", "separator");
			divider.textContent = "\xA0";
			think.parentElement.insertBefore(divider, next);
			inline += 1;
		}
		if (config.fold) {
			let currentTurn = null;
			let pendingLeads = [];
			const turns = [];
			for (const row of all) {
				const anchor = row.getAttribute("data-chat-anchor-key") || "";
				const kind = row.getAttribute("data-chat-flow-kind") || "null";
				const m = /^14:assistant-step(\d+):/.exec(anchor);
				if (m !== null) {
					const t = Number(m[1]);
					if (currentTurn === null || currentTurn.turn !== t) {
						currentTurn = {
							turn: t,
							steps: [],
							toolCalls: 0,
							hasTail: false,
							rows: [],
							timing: ""
						};
						for (const lead of pendingLeads) currentTurn.rows.push(lead);
						pendingLeads = [];
						turns.push(currentTurn);
					}
					currentTurn.steps.push(row);
					currentTurn.rows.push(row);
				} else if (anchor.indexOf("9:tool-call") === 0) {
					if (currentTurn !== null) {
						currentTurn.toolCalls += 1;
						currentTurn.rows.push(row);
					}
				} else if (anchor.indexOf("9:turn-tail") === 0) {
					if (currentTurn !== null) {
						currentTurn.hasTail = true;
						currentTurn.timing = cleanTiming(row.textContent || "");
					}
				} else if (kind === "user") {
					currentTurn = null;
					pendingLeads = [];
				} else if (kind === "context") pendingLeads.push(row);
			}
			const coveredRows = /* @__PURE__ */ new Set();
			for (const turn of turns) {
				if (!turn.hasTail) continue;
				let finalRow = null;
				for (let i = turn.steps.length - 1; i >= 0; i--) if (hasTextInStep(turn.steps[i])) {
					finalRow = turn.steps[i];
					break;
				}
				const processRows = [];
				if (finalRow === null) for (const row of turn.rows) processRows.push(row);
				else for (const row of turn.rows) {
					if (row === finalRow) break;
					processRows.push(row);
				}
				const finalThink = finalRow === null ? null : finalRow.querySelector("[data-variant=\"think\"]");
				if (processRows.length === 0 && finalThink === null) continue;
				for (const row of processRows) coveredRows.add(row);
				const firstRow = turn.rows[0];
				if (firstRow === void 0 || firstRow.parentElement === null) continue;
				let ctl = null;
				const prev = firstRow.previousElementSibling;
				if (prev !== null && prev.hasAttribute && prev.hasAttribute("data-tidychat-divider-block") && prev.getAttribute("data-tidychat-turn") === String(turn.turn)) ctl = prev;
				else {
					ctl = document.createElement("div");
					ctl.setAttribute("data-tidychat-divider-block", "1");
					ctl.setAttribute("data-tidychat-turn", String(turn.turn));
					ctl.setAttribute("role", "separator");
					const label = document.createElement("span");
					label.className = "tidychat-ctl-label";
					const line = document.createElement("div");
					line.className = "tidychat-ctl-line";
					const btn = document.createElement("button");
					btn.className = "tidychat-ctl-btn";
					btn.setAttribute("type", "button");
					ctl.appendChild(label);
					ctl.appendChild(line);
					ctl.appendChild(btn);
					btn.addEventListener("click", () => {
						const cur = foldState.get(turn.turn) ?? true;
						applyFold(turn, processRows, finalThink, ctl, !cur);
					});
					firstRow.parentElement.insertBefore(ctl, firstRow);
				}
				const folded = foldState.get(turn.turn) ?? true;
				applyFold(turn, processRows, finalThink, ctl, folded);
				if (folded) foldedCount += 1;
			}
			for (const row of all) {
				if (row.getAttribute("data-chat-flow-kind") !== "context") continue;
				if (coveredRows.has(row)) continue;
				if (row.hasAttribute("data-tidychat-folded")) continue;
				row.setAttribute("data-tidychat-folded", "1");
				hiddenContext += 1;
			}
		}
		return {
			inline,
			folded: foldedCount,
			hiddenContext
		};
	};
	const applyFold = (turn, processRows, finalThink, ctl, folded) => {
		foldState.set(turn.turn, folded);
		for (const row of processRows) if (folded) row.setAttribute("data-tidychat-folded", "1");
		else row.removeAttribute("data-tidychat-folded");
		if (finalThink !== null) if (folded) finalThink.setAttribute("data-tidychat-folded-inline", "1");
		else finalThink.removeAttribute("data-tidychat-folded-inline");
		if (ctl !== null) {
			const label = ctl.querySelector(".tidychat-ctl-label");
			const btn = ctl.querySelector(".tidychat-ctl-btn");
			const totalSteps = processRows.filter((r) => (r.getAttribute("data-chat-anchor-key") || "").indexOf("14:assistant-step") === 0).length + (finalThink !== null ? 1 : 0) + turn.toolCalls;
			const parts = [folded ? "过程 " + totalSteps + " 步" : "已展开 " + totalSteps + " 步"];
			if (turn.timing !== "") parts.push(turn.timing);
			const labelText = parts.join(" · ");
			const btnText = folded ? "展开" : "收起";
			if (label !== null && label.textContent !== labelText) label.textContent = labelText;
			if (btn !== null && btn.textContent !== btnText) btn.textContent = btnText;
		}
	};
	const findScrollContainer = () => document.querySelector("[data-conversation-scroll]");
	const scopedRows = (selector) => {
		const container = findScrollContainer();
		return Array.from((container ?? document).querySelectorAll(selector));
	};
	const isLoadOlderButton = (b) => {
		const t = (b.textContent || "").trim();
		return t === "加载更早" || t === "Load earlier" || t === "Load older";
	};
	const findLoadOlderButton = () => {
		for (const b of scopedRows("button")) if (isLoadOlderButton(b)) return b;
		return null;
	};
	const countAnchors = () => scopedRows("[data-chat-anchor-key]").length;
	const measuredScan = () => {
		const t0 = performance.now();
		try {
			applySurgery();
		} catch (err) {
			console.error("[dsh-tidychat] 扫描出错", err);
		}
		const ms = performance.now() - t0;
		try {
			notify();
		} catch {}
		return ms;
	};
	const showPausedHint = () => {
		if (document.querySelector("[data-tidychat-autoload-hint]") !== null) return;
		const btn = findLoadOlderButton();
		if (btn === null || btn.parentElement === null) return;
		const hint = document.createElement("span");
		hint.setAttribute("data-tidychat-autoload-hint", "1");
		hint.className = "tidychat-autoload-hint";
		hint.textContent = "为保持流畅，已暂停自动加载更早历史；可手动继续";
		btn.parentElement.insertBefore(hint, btn.nextSibling);
	};
	function pauseGovernor(st) {
		st.status = "paused";
		st.generation += 1;
		showPausedHint();
	}
	function scheduleNext(sessionId) {
		if (!config.autoLoad) return;
		if (sessionId !== activeSessionId) return;
		const st = governor.get(sessionId);
		if (st === void 0 || st.status !== "idle") return;
		const gen = ++st.generation;
		const run = () => {
			if (sessionId !== activeSessionId) return;
			const cur = governor.get(sessionId);
			if (cur === void 0 || cur.generation !== gen || cur.status !== "idle") return;
			loadOnePage(sessionId, gen);
		};
		let off = () => {};
		const w = window;
		if (typeof w.requestIdleCallback === "function") {
			const id = w.requestIdleCallback(() => {
				off();
				run();
			}, { timeout: 2e3 });
			off = track(() => w.cancelIdleCallback(id));
		} else {
			const id = setTimeout(() => {
				off();
				run();
			}, IDLE_FALLBACK_MS);
			off = track(() => clearTimeout(id));
		}
	}
	function loadOnePage(sessionId, gen) {
		if (!config.autoLoad) return;
		if (sessionId !== activeSessionId) return;
		const st = governor.get(sessionId);
		if (st === void 0 || st.generation !== gen || st.status !== "idle") return;
		const btn = findLoadOlderButton();
		if (btn === null) {
			if (st.nullStreak >= NULL_RETRY_LIMIT) {
				st.status = "done";
				return;
			}
			st.nullStreak += 1;
			st.status = "idle";
			let off = () => {};
			const id = setTimeout(() => {
				off();
				scheduleNext(sessionId);
			}, NULL_RETRY_DELAY_MS);
			off = track(() => clearTimeout(id));
			return;
		}
		st.nullStreak = 0;
		if (btn.disabled) {
			st.status = "idle";
			let off = () => {};
			const id = setTimeout(() => {
				off();
				scheduleNext(sessionId);
			}, NULL_RETRY_DELAY_MS);
			off = track(() => clearTimeout(id));
			return;
		}
		st.status = "loading";
		settleThenMeasure(sessionId, gen, countAnchors());
		try {
			btn.click();
		} catch {}
	}
	function settleThenMeasure(sessionId, gen, before) {
		const st0 = governor.get(sessionId);
		if (st0 !== void 0) st0.status = "settling";
		let quietTimer = null;
		let settleTimeout = null;
		let obs = null;
		let finished = false;
		const finish = (isTimeout) => {
			if (finished) return;
			finished = true;
			if (quietTimer !== null) clearTimeout(quietTimer);
			if (settleTimeout !== null) clearTimeout(settleTimeout);
			obs?.disconnect();
			if (sessionId !== activeSessionId) return;
			const st = governor.get(sessionId);
			if (st === void 0 || st.generation !== gen || st.status !== "settling") return;
			const grew = countAnchors() > before;
			const stillHasButton = findLoadOlderButton() !== null;
			const scanMs = measuredScan();
			if (isTimeout || !grew && stillHasButton) {
				pauseGovernor(st);
				return;
			}
			if (scanMs >= HARD_BUDGET_MS) {
				pauseGovernor(st);
				return;
			}
			if (scanMs >= SOFT_BUDGET_MS) {
				st.consecutiveSlow += 1;
				if (st.consecutiveSlow >= CONSECUTIVE_SLOW_LIMIT) {
					pauseGovernor(st);
					return;
				}
			} else st.consecutiveSlow = 0;
			if (grew && !stillHasButton) {
				st.status = "done";
				return;
			}
			st.status = "idle";
			scheduleNext(sessionId);
		};
		const container = findScrollContainer();
		obs = new MutationObserver(() => {
			if (finished) return;
			if (quietTimer !== null) clearTimeout(quietTimer);
			quietTimer = setTimeout(() => {
				finish(false);
			}, SETTLE_QUIET_MS);
		});
		obs.observe(container ?? document.body, {
			childList: true,
			subtree: true
		});
		settleTimeout = setTimeout(() => {
			finish(true);
		}, SETTLE_TIMEOUT_MS);
	}
	const scan = () => {
		const t0 = performance.now();
		try {
			applySurgery();
			notify();
		} catch (err) {
			console.error("[dsh-tidychat] 扫描出错", err);
		}
		lastScanMs = performance.now() - t0;
		if (lastScanMs > peakScanMs) peakScanMs = lastScanMs;
		scanCount += 1;
		dirty = false;
	};
	const debugEnabled = () => {
		try {
			if (localStorage.getItem("dsh-tidychat-debug") === "1") return true;
			if (window.__tidychatDebug === true) return true;
			if (/[?&]tidychat-debug=1/.test(location.search)) return true;
		} catch {}
		return false;
	};
	const report = () => {
		if (!debugEnabled()) return;
		const st = activeSessionId !== null ? governor.get(activeSessionId) : void 0;
		const turns = scopedRows("[data-chat-anchor-key]").filter((r) => r.getAttribute("data-chat-flow-kind") === "user").length;
		console.log("[tidychat perf]", {
			sessionTurns: turns,
			scanMs: Math.round(lastScanMs),
			navItems: turns + "/" + turns,
			autoloadStatus: st?.status ?? "n/a",
			autoloadPaused: st?.status === "paused"
		});
	};
	window.__tidychatReport = report;
	ctx.effect(() => {
		const id = setInterval(report, 1e4);
		return () => {
			clearInterval(id);
			if (window.__tidychatReport === report) delete window.__tidychatReport;
		};
	});
	const detectIssues = () => {
		const st = activeSessionId !== null ? governor.get(activeSessionId) : void 0;
		const issues = [];
		if (peakScanMs >= SOFT_BUDGET_MS) issues.push(`扫描峰值 ${Math.round(peakScanMs)}ms（≥${SOFT_BUDGET_MS}ms 预算），可能存在卡顿迹象`);
		if (st?.status === "paused") issues.push("自动加载已暂停（性能闸门触发）");
		if (!config.autoLoad) issues.push("自动加载已关闭，历史窗口偏小");
		if (config.autoLoad && findLoadOlderButton() !== null && st?.status === "idle") issues.push("自动加载开启但未在加载，且仍有更早历史未加载");
		return issues;
	};
	const buildReport = (tags, issues) => {
		const st = activeSessionId !== null ? governor.get(activeSessionId) : void 0;
		const rows = scopedRows("[data-chat-anchor-key]");
		const turns = rows.filter((r) => r.getAttribute("data-chat-flow-kind") === "user").length;
		const hasMore = findLoadOlderButton() !== null;
		return [
			"## 问题报告（dsh-tidychat 自动生成）",
			"",
			"### 环境",
			`- 时间：${(/* @__PURE__ */ new Date()).toLocaleString()}`,
			"- DSH 版本：请运行 `dsh --version` 后填写（如 0.1.1-rc.2）",
			`- 插件版本：0.2.1`,
			`- 浏览器：${navigator.userAgent}`,
			"",
			"### 会话规模",
			`- 会话 ID：${activeSessionId ?? "n/a"}`,
			`- 已加载用户轮次：${turns}（仅当前已加载窗口）`,
			`- 已加载消息行（含思考/工具调用）：${rows.length}`,
			`- 更早历史：${hasMore ? "仍有未加载（autoLoad 关闭或暂停时窗口偏小）" : "已全部加载"}`,
			"",
			"### 性能",
			`- 最近扫描耗时：${Math.round(lastScanMs)}ms`,
			`- 峰值扫描耗时：${Math.round(peakScanMs)}ms`,
			`- 本次页面已扫描：${scanCount} 次`,
			"",
			"### 自动加载",
			`- 开关：${config.autoLoad ? "开" : "关（历史不会自动加载完整，窗口偏小）"}`,
			`- 状态：${st?.status ?? "n/a"}`,
			"",
			"### 定位条",
			`- 已渲染/总数：${turns}/${turns}`,
			"",
			"### 开关配置",
			`- fold: ${config.fold} / divider: ${config.divider} / navigator: ${config.navigator} / autoLoad: ${config.autoLoad}`,
			...issues.length > 0 ? [
				"",
				"### 系统检测（自动）",
				...issues.map((i) => `- ⚠️ ${i}`)
			] : [],
			"",
			"### 问题描述",
			...tags.length > 0 ? [`- 现象：${tags.join("、")}`] : [],
			tags.length === 0 && issues.length === 0 ? "（请描述遇到的问题，例如：长会话滚动卡顿、定位条不显示、自动加载异常…）" : "（如无需补充说明，直接提交即可）"
		].join("\n");
	};
	const reportAndOpenIssue = (tags) => {
		const issues = detectIssues();
		const text = buildReport(tags, issues);
		const title = `[问题报告] ${tags.length > 0 ? tags.join("、") : issues.length > 0 ? "检测到异常" : "问题反馈"}（插件 v0.2.1）`;
		try {
			navigator.clipboard?.writeText(text);
		} catch {}
		window.open("https://github.com/BananaSoldier01/dsh-tidychat/issues/new?title=" + encodeURIComponent(title) + "&body=" + encodeURIComponent(text), "_blank");
	};
	const NAV_HUE_PALETTE = {
		gray: [
			"rgba(225,225,225,0.9)",
			"rgba(190,190,190,0.78)",
			"rgba(128,128,128,0.8)",
			"rgba(70,70,70,0.85)",
			"rgba(20,20,20,0.92)"
		],
		black: [
			"rgba(90,90,90,0.8)",
			"rgba(60,60,60,0.85)",
			"rgba(30,30,30,0.9)",
			"rgba(12,12,12,0.94)",
			"rgba(0,0,0,0.97)"
		],
		white: [
			"rgba(255,255,255,0.95)",
			"rgba(250,250,250,0.9)",
			"rgba(240,240,240,0.85)",
			"rgba(225,225,225,0.8)",
			"rgba(205,205,205,0.75)"
		],
		blue: [
			"#93c5fd",
			"#60a5fa",
			"#3b82f6",
			"#2563eb",
			"#1e40af"
		],
		violet: [
			"#c4b5fd",
			"#a78bfa",
			"#8b5cf6",
			"#7c3aed",
			"#5b21b6"
		],
		cyan: [
			"#67e8f9",
			"#22d3ee",
			"#06b6d4",
			"#0891b2",
			"#155e75"
		],
		green: [
			"#86efac",
			"#4ade80",
			"#22c55e",
			"#16a34a",
			"#166534"
		],
		orange: [
			"#fdba74",
			"#fb923c",
			"#f97316",
			"#ea580c",
			"#9a3412"
		],
		red: [
			"#fca5a5",
			"#f87171",
			"#ef4444",
			"#dc2626",
			"#991b1b"
		]
	};
	const NAV_LIGHT_IDX = {
		l1: 0,
		l2: 1,
		l3: 2,
		l4: 3,
		l5: 4
	};
	const hueColor = (hue, light, fallback) => {
		if (typeof hue === "string") {
			const palette = NAV_HUE_PALETTE[hue];
			if (palette !== void 0) return palette[NAV_LIGHT_IDX[typeof light === "string" ? light : "l3"] ?? 2];
		}
		return fallback;
	};
	const parseRgba = (s) => {
		const t = (s ?? "").trim().toLowerCase();
		if (t === "") return null;
		if (t === "transparent") return [
			0,
			0,
			0,
			0
		];
		const hex = /^#([0-9a-f]{3,8})$/.exec(t);
		if (hex !== null) {
			let h = hex[1];
			if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("");
			if (h.length === 6) h += "ff";
			const n = parseInt(h, 16);
			return [
				n >> 24 & 255,
				n >> 16 & 255,
				n >> 8 & 255,
				Math.round((n & 255) / 255 * 1e3) / 1e3
			];
		}
		const num = (x, base) => {
			const v = x.trim();
			if (v === "") return null;
			const p = v.endsWith("%") ? Number(v.slice(0, -1)) : Number(v);
			if (Number.isNaN(p)) return null;
			if (base === 255 && v.endsWith("%")) return Math.round(p / 100 * 255);
			if (base === 1 && v.endsWith("%")) return p / 100;
			return base === 1 ? p : Math.round(p);
		};
		const comma = /^rgba?\(\s*([\d.]+%?)\s*,\s*([\d.]+%?)\s*,\s*([\d.]+%?)(?:\s*,\s*([\d.]+%?))?\s*\)$/.exec(t);
		if (comma !== null) {
			const r = num(comma[1], 255);
			const g = num(comma[2], 255);
			const b = num(comma[3], 255);
			const a = comma[4] !== void 0 ? num(comma[4], 1) : 1;
			if (r === null || g === null || b === null || a === null) return null;
			return [
				r,
				g,
				b,
				a
			];
		}
		const space = /^rgba?\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+%?)(?:\s*\/\s*([\d.]+%?))?\s*\)$/.exec(t);
		if (space !== null) {
			const r = num(space[1], 255);
			const g = num(space[2], 255);
			const b = num(space[3], 255);
			const a = space[4] !== void 0 ? num(space[4], 1) : 1;
			if (r === null || g === null || b === null || a === null) return null;
			return [
				r,
				g,
				b,
				a
			];
		}
		return null;
	};
	const parseRgb = (s) => {
		const a = parseRgba(s);
		return a === null ? null : [
			a[0],
			a[1],
			a[2]
		];
	};
	const compositeOver = (r, g, b, a, under) => {
		if (a <= 0) return under;
		if (a >= 1) return [
			r,
			g,
			b
		];
		return [
			Math.round(r * a + under[0] * (1 - a)),
			Math.round(g * a + under[1] * (1 - a)),
			Math.round(b * a + under[2] * (1 - a))
		];
	};
	const findBackgroundRgb = () => {
		try {
			let el = findScrollContainer();
			let cr = 0, cg = 0, cb = 0, ca = 0;
			while (el !== null) {
				const rgba = parseRgba(getComputedStyle(el).backgroundColor);
				if (rgba !== null && rgba[3] > 0) {
					const aOut = ca + rgba[3] * (1 - ca);
					cr = ca > 0 ? Math.round((cr * ca + rgba[0] * rgba[3] * (1 - ca)) / aOut) : rgba[0];
					cg = ca > 0 ? Math.round((cg * ca + rgba[1] * rgba[3] * (1 - ca)) / aOut) : rgba[1];
					cb = ca > 0 ? Math.round((cb * ca + rgba[2] * rgba[3] * (1 - ca)) / aOut) : rgba[2];
					if (aOut >= .995) return [
						cr,
						cg,
						cb
					];
					ca = aOut;
				}
				el = el.parentElement;
			}
			return ca > .2 ? [
				cr,
				cg,
				cb
			] : null;
		} catch {}
		return null;
	};
	const isDarkBackground = () => {
		const rgb = findBackgroundRgb();
		if (rgb !== null) return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2] < 128;
		try {
			if (typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches) return true;
		} catch {}
		return false;
	};
	const contrastRatio = (a, b) => {
		const lum = (c) => {
			const f = (v) => {
				const s = v / 255;
				return s <= .03928 ? s / 12.92 : Math.pow((s + .055) / 1.055, 2.4);
			};
			return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]);
		};
		const la = lum(a);
		const lb = lum(b);
		const hi = Math.max(la, lb);
		const lo = Math.min(la, lb);
		return (hi + .05) / (lo + .05);
	};
	const resolveNavColors = () => {
		const cs = getComputedStyle(document.documentElement);
		const brand = cs.getPropertyValue("--dsw-alias-state-business-primary").trim() || "#3b82f6";
		const caption = cs.getPropertyValue("--dsw-alias-label-caption").trim() || "rgba(127,127,127,0.5)";
		let bar;
		if ((config.navColor ?? "auto") === "auto") {
			const captionRgb = parseRgb(caption);
			const bgRgb = findBackgroundRgb();
			if (captionRgb !== null && bgRgb !== null && contrastRatio(captionRgb, bgRgb) >= 3) bar = caption;
			else bar = isDarkBackground() ? "rgba(226,226,226,0.85)" : "rgba(80,80,80,0.78)";
		} else bar = hueColor(config.navColor, config.navColorLight, caption);
		const hot = (config.navAccent ?? "auto") === "auto" ? brand : hueColor(config.navAccent, config.navAccentLight, brand);
		return {
			bar,
			hot
		};
	};
	const resolveTipColors = () => {
		const cs = getComputedStyle(document.documentElement);
		const primary = cs.getPropertyValue("--dsw-alias-label-primary").trim() || "#222";
		const secondary = cs.getPropertyValue("--dsw-alias-label-secondary").trim() || "#666";
		const tipBg = parseRgba(cs.getPropertyValue("--dsw-alias-bg-layer-3").trim());
		if (tipBg === null) return {
			text: primary,
			head: secondary
		};
		let bg = [
			tipBg[0],
			tipBg[1],
			tipBg[2]
		];
		if (tipBg[3] < .9) {
			const under = findBackgroundRgb();
			if (under !== null) bg = compositeOver(tipBg[0], tipBg[1], tipBg[2], tipBg[3], under);
		}
		const darkBg = .2126 * bg[0] + .7152 * bg[1] + .0722 * bg[2] < 128;
		const fix = (candidate) => {
			const rgb = parseRgb(candidate);
			if (rgb !== null && contrastRatio(rgb, bg) >= 3) return candidate;
			return darkBg ? "rgba(235,235,235,0.92)" : "rgba(55,55,55,0.92)";
		};
		return {
			text: fix(primary),
			head: fix(secondary)
		};
	};
	const applyNavColors = () => {
		const { bar, hot } = resolveNavColors();
		const { text, head } = resolveTipColors();
		const root = document.documentElement;
		if (root.style.getPropertyValue("--tidychat-nav-color") !== bar) root.style.setProperty("--tidychat-nav-color", bar);
		if (root.style.getPropertyValue("--tidychat-nav-color-hot") !== hot) root.style.setProperty("--tidychat-nav-color-hot", hot);
		if (root.style.getPropertyValue("--tidychat-nav-tip-text") !== text) root.style.setProperty("--tidychat-nav-tip-text", text);
		if (root.style.getPropertyValue("--tidychat-nav-tip-head") !== head) root.style.setProperty("--tidychat-nav-tip-head", head);
	};
	if (settingsScope !== null) {
		const readConfig = () => {
			try {
				const snap = settingsScope.getSnapshot();
				if (snap !== null && snap !== void 0 && snap.status === "ready" && snap.value) {
					config.fold = snap.value.fold ?? true;
					config.divider = snap.value.divider ?? true;
					config.navigator = snap.value.navigator ?? true;
					config.autoLoad = snap.value.autoLoad ?? true;
					config.navColor = typeof snap.value.navColor === "string" ? snap.value.navColor : "auto";
					config.navColorLight = typeof snap.value.navColorLight === "string" ? snap.value.navColorLight : "l3";
					config.navAccent = typeof snap.value.navAccent === "string" ? snap.value.navAccent : "auto";
					config.navAccentLight = typeof snap.value.navAccentLight === "string" ? snap.value.navAccentLight : "l3";
				}
			} catch {}
		};
		readConfig();
		applyNavColors();
		ctx.effect(() => {
			let unsub = () => {};
			try {
				unsub = settingsScope.subscribe(() => {
					readConfig();
					applyNavColors();
					scan();
					if (config.autoLoad && activeSessionId !== null) scheduleNext(activeSessionId);
				});
			} catch {}
			return () => {
				try {
					unsub();
				} catch {}
			};
		});
	}
	scan();
	applyNavColors();
	let mainObserver = null;
	let mainTarget = document.body;
	let mainPending = null;
	const rebindMainObserver = () => {
		const next = findScrollContainer() ?? document.body;
		if (mainObserver !== null && next === mainTarget) return;
		if (mainObserver !== null) mainObserver.disconnect();
		mainTarget = next;
		mainObserver = new MutationObserver(() => {
			dirty = true;
			if (mainPending !== null) return;
			mainPending = setTimeout(() => {
				mainPending = null;
				if (!isGovernorBusy()) scan();
			}, 250);
		});
		mainObserver.observe(mainTarget, {
			childList: true,
			subtree: true
		});
	};
	ctx.effect(() => {
		if (typeof MutationObserver === "undefined") return;
		const themeObs = new MutationObserver(() => {
			applyNavColors();
		});
		themeObs.observe(document.documentElement, {
			attributes: true,
			attributeFilter: [
				"class",
				"style",
				"data-theme"
			]
		});
		return () => {
			themeObs.disconnect();
			document.documentElement.style.removeProperty("--tidychat-nav-color");
			document.documentElement.style.removeProperty("--tidychat-nav-color-hot");
			document.documentElement.style.removeProperty("--tidychat-nav-tip-text");
			document.documentElement.style.removeProperty("--tidychat-nav-tip-head");
		};
	});
	ctx.effect(() => {
		rebindMainObserver();
		const intervalId = setInterval(() => {
			rebindMainObserver();
			applyNavColors();
			if (!isGovernorBusy() && dirty) scan();
		}, 5e3);
		return () => {
			if (mainObserver !== null) mainObserver.disconnect();
			mainObserver = null;
			clearInterval(intervalId);
			if (mainPending !== null) clearTimeout(mainPending);
		};
	});
	const NAV_RAIL_WIDTH = 48;
	const measurePos = () => {
		const host = document.querySelector("[data-conversation-scroll]");
		if (host === null) return null;
		const r = host.getBoundingClientRect();
		if (r.width < 10 || r.height < 10) return null;
		const content = scopedRows("[data-composer-card]")[0] ?? scopedRows("[data-chat-anchor-key]")[0];
		const gutter = content !== null ? Math.max(0, content.getBoundingClientRect().left - r.left) : r.width;
		return {
			left: r.left,
			top: r.top + r.height * .5,
			gutter
		};
	};
	const hhmm = (ms) => {
		const d = new Date(ms);
		const pad = (n) => n < 10 ? "0" + n : String(n);
		return d.getMonth() + 1 + "月" + d.getDate() + "日 " + pad(d.getHours()) + ":" + pad(d.getMinutes());
	};
	const NAV_RAIL_BAR_H = 3;
	const NAV_RAIL_BAR_LEN = 14;
	const NAV_RAIL_BAR_LEN_NEAR = 26;
	const NAV_RAIL_BAR_LEN_CURRENT = 22;
	const NAV_RAIL_FISH_EYE_RADIUS = 4;
	const NAV_RAIL_FISH_EYE_BOOST = .5;
	const NAV_RAIL_TURN_SPACING = 12;
	const NAV_RAIL_MIN_HEIGHT = 48;
	const HEADER_OFFSET = 64;
	const railHeight = (n) => Math.min(Math.min(window.innerHeight * .7, 660), Math.max(NAV_RAIL_MIN_HEIGHT, n * NAV_RAIL_TURN_SPACING));
	ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
		name: "conversation.session.header.utilities",
		id: "tidychat-nav"
	}, (props) => {
		const [pos, setPos] = react.useState(null);
		const [snapshot, setSnapshot] = react.useState(null);
		const [tip, setTip] = react.useState(null);
		const [hover, setHover] = react.useState(null);
		const [current, setCurrent] = react.useState(null);
		const [enabled, setEnabled] = react.useState(config.navigator);
		const canvasRef = react.useRef(null);
		const rowCacheRef = react.useRef({
			rows: [],
			tops: [],
			count: -1,
			scrollH: -1
		});
		const userRows = () => scopedRows("[data-chat-anchor-key]").filter((r) => r.getAttribute("data-chat-flow-kind") === "user");
		const rebuildRowCache = (count, scrollH) => {
			const rows = userRows();
			const container = findScrollContainer();
			if (container === null) {
				rowCacheRef.current = {
					rows: [],
					tops: [],
					count,
					scrollH
				};
				return;
			}
			const cRect = container.getBoundingClientRect();
			const tops = rows.map((r) => r.getBoundingClientRect().top - cRect.top + container.scrollTop);
			rowCacheRef.current = {
				rows,
				tops,
				count,
				scrollH
			};
		};
		const detectCurrent = () => {
			const container = findScrollContainer();
			const tops = rowCacheRef.current.tops;
			if (container === null || tops.length === 0) return;
			const target = container.scrollTop + HEADER_OFFSET;
			let lo = 0;
			let hi = tops.length - 1;
			let ans = -1;
			while (lo <= hi) {
				const mid = lo + hi >> 1;
				if (tops[mid] <= target) {
					ans = mid;
					lo = mid + 1;
				} else hi = mid - 1;
			}
			const cur = ans === -1 ? 0 : ans;
			setCurrent((p) => p === cur ? p : cur);
		};
		const layoutPositions = (n, hoverIdx, H) => {
			const weights = [];
			for (let i = 0; i < n; i++) {
				let w = 1;
				if (hoverIdx !== null) {
					const d = Math.abs(i - hoverIdx);
					if (d <= NAV_RAIL_FISH_EYE_RADIUS) w = 1 + (NAV_RAIL_FISH_EYE_RADIUS - d + 1) * NAV_RAIL_FISH_EYE_BOOST;
				}
				weights.push(w);
			}
			const total = weights.reduce((a, b) => a + b, 0);
			const usable = Math.max(H - NAV_RAIL_BAR_H, 1);
			const pos = [];
			let acc = 0;
			for (let i = 0; i < n; i++) {
				acc += weights[i];
				pos.push((acc - weights[i] / 2) / total * usable + NAV_RAIL_BAR_H / 2);
			}
			return pos;
		};
		const indexFromY = (y, positions) => {
			if (positions.length === 0) return 0;
			let lo = 0;
			let hi = positions.length - 1;
			while (lo < hi) {
				const mid = lo + hi >> 1;
				if (positions[mid] < y) lo = mid + 1;
				else hi = mid;
			}
			const cur = positions[lo];
			const prev = lo > 0 ? positions[lo - 1] : -Infinity;
			const candidate = Math.abs(cur - y) <= Math.abs(prev - y) ? lo : lo - 1;
			return Math.max(0, Math.min(positions.length - 1, candidate));
		};
		const redraw = () => {
			const canvas = canvasRef.current;
			if (canvas === null) return;
			const n = users.length;
			if (n === 0) return;
			const H = railHeight(users.length);
			const W = NAV_RAIL_WIDTH - 8;
			const dpr = window.devicePixelRatio || 1;
			if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
				canvas.width = Math.round(W * dpr);
				canvas.height = Math.round(H * dpr);
				canvas.style.width = "40px";
				canvas.style.height = H + "px";
			}
			const ctx = canvas.getContext("2d");
			if (ctx === null) return;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, W, H);
			const cs = getComputedStyle(document.documentElement);
			const barColor = cs.getPropertyValue("--tidychat-nav-color").trim() || cs.getPropertyValue("--dsw-alias-label-caption").trim() || "rgba(127,127,127,0.5)";
			const hotColor = cs.getPropertyValue("--tidychat-nav-color-hot").trim() || cs.getPropertyValue("--dsw-alias-state-business-primary").trim() || "#3b82f6";
			const positions = layoutPositions(n, hover, H);
			const nearest = (i) => hover !== null && Math.abs(i - hover) <= 2;
			for (let i = 0; i < n; i++) {
				const y = positions[i];
				const isCurrent = current === i;
				const isHover = hover === i;
				const len = isHover ? NAV_RAIL_BAR_LEN_NEAR : isCurrent ? NAV_RAIL_BAR_LEN_CURRENT : nearest(i) ? 18 : NAV_RAIL_BAR_LEN;
				ctx.fillStyle = isCurrent || isHover ? hotColor : barColor;
				ctx.fillRect(0, y - NAV_RAIL_BAR_H / 2, len, NAV_RAIL_BAR_H);
				if (isCurrent) {
					ctx.fillStyle = hotColor;
					ctx.beginPath();
					ctx.moveTo(len + 2, y);
					ctx.lineTo(len + 6, y - 3);
					ctx.lineTo(len + 6, y + 3);
					ctx.closePath();
					ctx.fill();
				}
			}
		};
		react.useEffect(() => {
			const sid = props.sessionId;
			if (typeof sid === "string" && sid !== "") {
				activeSessionId = sid;
				if (!governor.has(sid)) governor.set(sid, {
					generation: 0,
					status: "idle",
					consecutiveSlow: 0,
					nullStreak: 0
				});
				rebindMainObserver();
				scheduleNext(sid);
			}
			if (typeof sid === "undefined" || sid === null) return;
			const binding = ctx.sessions.binding(sid);
			if (binding === void 0 || binding.session === void 0) return;
			const face = binding.session;
			const pull = () => {
				let snap = null;
				try {
					snap = face.getSnapshot();
				} catch {
					snap = null;
				}
				setSnapshot(snap);
			};
			pull();
			let unsub = () => {};
			try {
				unsub = face.subscribe(pull);
			} catch {
				unsub = () => {};
			}
			const refresh = () => {
				setPos(measurePos());
				setEnabled(config.navigator);
			};
			refresh();
			listeners.push(refresh);
			let resizeObs = null;
			const container = findScrollContainer();
			if (container !== null && typeof ResizeObserver !== "undefined") {
				resizeObs = new ResizeObserver(() => {
					refresh();
				});
				resizeObs.observe(container);
			}
			window.addEventListener("resize", refresh);
			let scrollRaf = 0;
			const onScroll = () => {
				if (scrollRaf !== 0) return;
				scrollRaf = requestAnimationFrame(() => {
					scrollRaf = 0;
					detectCurrent();
				});
			};
			if (container !== null) container.addEventListener("scroll", onScroll, { passive: true });
			return () => {
				try {
					unsub();
				} catch {}
				const i = listeners.indexOf(refresh);
				if (i >= 0) listeners.splice(i, 1);
				resizeObs?.disconnect();
				window.removeEventListener("resize", refresh);
				if (container !== null) container.removeEventListener("scroll", onScroll);
				if (scrollRaf !== 0) cancelAnimationFrame(scrollRaf);
			};
		}, [props.sessionId]);
		const users = [];
		if (snapshot !== null && snapshot !== void 0 && Array.isArray(snapshot.nodes)) for (const node of snapshot.nodes) {
			if (node === null || node === void 0 || node.kind !== "user") continue;
			let text = "";
			if (Array.isArray(node.content)) {
				for (const block of node.content) if (block !== null && block !== void 0 && typeof block.text === "string") text += block.text;
			}
			users.push({
				seq: node.seq,
				time: node.time,
				summary: String(text).trim().slice(0, 120)
			});
		}
		react.useEffect(() => {
			const container = findScrollContainer();
			const scrollH = container !== null ? container.scrollHeight : 0;
			if (rowCacheRef.current.count !== users.length || rowCacheRef.current.scrollH !== scrollH) rebuildRowCache(users.length, scrollH);
			detectCurrent();
			redraw();
		});
		const jumpTo = (index) => {
			const target = rowCacheRef.current.rows[index];
			if (target === void 0) return;
			const container = findScrollContainer();
			if (container === null) return;
			const cRect = container.getBoundingClientRect();
			const tRect = target.getBoundingClientRect();
			container.scrollTo({
				top: tRect.top - cRect.top + container.scrollTop - HEADER_OFFSET,
				behavior: "smooth"
			});
		};
		const handlePointerMove = (ev) => {
			const canvas = canvasRef.current;
			if (canvas === null) return;
			const rect = canvas.getBoundingClientRect();
			const idx = indexFromY(ev.clientY - rect.top, layoutPositions(users.length, hover, railHeight(users.length)));
			if (idx !== hover) setHover(idx);
			const u = users[idx];
			if (u !== void 0) setTip({
				x: ev.clientX + 18,
				y: ev.clientY - 8,
				num: idx + 1,
				time: u.time !== void 0 && u.time !== null ? hhmm(u.time) : "",
				text: u.summary
			});
		};
		const handlePointerLeave = () => {
			setHover(null);
			setTip(null);
		};
		const handlePointerDown = (ev) => {
			try {
				ev.currentTarget.setPointerCapture(ev.pointerId);
			} catch {}
		};
		const handlePointerUp = (ev) => {
			const canvas = canvasRef.current;
			if (canvas !== null) {
				const rect = canvas.getBoundingClientRect();
				const idx = indexFromY(ev.clientY - rect.top, layoutPositions(users.length, hover, railHeight(users.length)));
				jumpTo(idx);
			}
			try {
				ev.currentTarget.releasePointerCapture(ev.pointerId);
			} catch {}
			setHover(null);
			setTip(null);
		};
		if (!enabled) return null;
		if (pos !== null && pos.gutter < NAV_RAIL_WIDTH) return null;
		if (users.length === 0) return null;
		const style = pos === null ? {
			left: "280px",
			top: "50vh"
		} : {
			left: pos.left + "px",
			top: pos.top + "px"
		};
		const rail = react.createElement("div", {
			className: "tidychat-nav-rail",
			style: Object.assign({ transform: "translateY(-50%)" }, style),
			"aria-label": "用户消息定位"
		}, react.createElement("canvas", {
			ref: canvasRef,
			className: "tidychat-nav-canvas",
			onPointerMove: handlePointerMove,
			onPointerLeave: handlePointerLeave,
			onPointerDown: handlePointerDown,
			onPointerUp: handlePointerUp
		}));
		const tipEl = tip === null ? null : react.createElement("div", {
			className: "tidychat-nav-tip",
			style: {
				left: tip.x + "px",
				top: tip.y + "px"
			}
		}, react.createElement("div", { className: "tidychat-nav-tip-head" }, "#" + tip.num + (tip.time !== "" ? " · " + tip.time : "")), react.createElement("div", null, tip.text));
		return react.createElement(react.Fragment, null, rail, tipEl);
	}));
	const TidychatSettingsCard = () => {
		const [open, setOpen] = react.useState(false);
		const [colorOpen, setColorOpen] = react.useState(false);
		const [reportTags, setReportTags] = react.useState([]);
		const [snap, setSnap] = react.useState(null);
		react.useEffect(() => {
			if (settingsScope === null) {
				setSnap(null);
				return;
			}
			const pull = () => {
				try {
					setSnap(settingsScope.getSnapshot());
				} catch {
					setSnap(null);
				}
			};
			pull();
			let unsub = () => {};
			try {
				unsub = settingsScope.subscribe(pull);
			} catch {
				unsub = () => {};
			}
			return () => {
				try {
					unsub();
				} catch {}
			};
		}, []);
		const value = snap !== null && snap !== void 0 && snap.value ? snap.value : {
			fold: true,
			divider: true,
			navigator: true,
			autoLoad: true,
			navColor: "auto",
			navColorLight: "l3",
			navAccent: "auto",
			navAccentLight: "l3",
			debug: false
		};
		const writable = snap !== null && snap !== void 0 ? snap.writable : false;
		const fields = [
			[
				"fold",
				"自动折叠已完成轮次",
				"隐藏思考、工具调用与中间文字，只保留最终结论，控制条含处理时长。"
			],
			[
				"divider",
				"思考↔文字分隔线",
				"在思考行与正文文字之间插入实线，区分过程与结论。"
			],
			[
				"navigator",
				"左缘定位条",
				"聊天区左缘的细窄条状导航，悬停显示摘要、点击跳转到对应消息。"
			],
			[
				"autoLoad",
				"智能加载更早历史",
				"在页面空闲时逐步加载更早记录；检测到页面响应下降时自动暂停，以保持长会话流畅。需要时仍可手动继续加载。"
			]
		];
		const toggle = (field) => {
			if (settingsScope === null) return;
			const cur = value[field] ?? true;
			settingsScope.set(field, !cur).catch(() => {});
		};
		const setColor = (field, val) => {
			if (settingsScope === null) return;
			settingsScope.set(field, val).catch(() => {});
		};
		const chipRow = (opts, selected, onClick, disabled) => react.createElement("div", { className: "tidychat-color-chips" }, opts.map((o) => react.createElement("button", {
			key: o.key,
			type: "button",
			title: o.label,
			"aria-pressed": selected === o.key,
			className: "tidychat-nav-color-chip" + (selected === o.key ? " tidychat-nav-color-chip-on" : ""),
			disabled,
			onClick: () => onClick(o.key)
		}, o.preview !== void 0 ? react.createElement("span", {
			className: "tidychat-nav-color-dot",
			style: { background: o.preview }
		}) : null, o.label)));
		const AUTO_OPT = {
			key: "auto",
			label: "自动",
			preview: "linear-gradient(135deg, #222 50%, #f2f2f2 50%)"
		};
		const ACCENT_AUTO_OPT = {
			key: "auto",
			label: "自动",
			preview: "var(--dsw-alias-state-business-primary, #3b82f6)"
		};
		return react.createElement("li", { className: "tidychat-card" + (open ? " tidychat-card-open" : "") }, react.createElement("button", {
			type: "button",
			className: "tidychat-card-header",
			"aria-expanded": open,
			onClick: () => setOpen(!open)
		}, react.createElement("span", { className: "tidychat-card-headtext" }, react.createElement("span", { className: "tidychat-card-name" }, "会话整理"), react.createElement("span", { className: "tidychat-card-desc" }, "折叠、分隔线、定位条 —— 把长会话整理成可扫读的结论流")), react.createElement("svg", {
			className: "tidychat-card-chevron" + (open ? " tidychat-card-chevron-open" : ""),
			viewBox: "0 0 14 14",
			width: 14,
			height: 14,
			fill: "none"
		}, react.createElement("path", {
			d: "M3.5 5.5L7 9l3.5-3.5",
			stroke: "currentColor",
			strokeWidth: 1.5,
			strokeLinecap: "round",
			strokeLinejoin: "round"
		}))), open ? react.createElement("div", { className: "tidychat-card-body" }, fields.map(([field, label, hint]) => react.createElement("div", {
			key: field,
			className: "tidychat-field"
		}, react.createElement("div", { className: "tidychat-field-head" }, react.createElement("span", { className: "tidychat-field-label" }, label), react.createElement("button", {
			type: "button",
			className: "tidychat-switch" + (value[field] === true ? " tidychat-switch-on" : ""),
			role: "switch",
			"aria-checked": value[field] === true,
			disabled: !writable,
			onClick: () => toggle(field)
		})), react.createElement("p", { className: "tidychat-field-hint" }, hint))), react.createElement("div", {
			key: "navColors",
			className: "tidychat-field"
		}, react.createElement("button", {
			type: "button",
			className: "tidychat-group-head",
			"aria-expanded": colorOpen,
			onClick: () => setColorOpen(!colorOpen)
		}, react.createElement("span", { className: "tidychat-group-title" }, "配色（高级）"), react.createElement("span", { className: "tidychat-group-note" }, "定位条与强调色"), react.createElement("svg", {
			className: "tidychat-card-chevron" + (colorOpen ? " tidychat-card-chevron-open" : ""),
			viewBox: "0 0 14 14",
			width: 14,
			height: 14,
			fill: "none"
		}, react.createElement("path", {
			d: "M3.5 5.5L7 9l3.5-3.5",
			stroke: "currentColor",
			strokeWidth: 1.5,
			strokeLinecap: "round",
			strokeLinejoin: "round"
		}))), colorOpen ? react.createElement("div", { className: "tidychat-group-body" }, react.createElement("div", {
			key: "navColor",
			className: "tidychat-field"
		}, react.createElement("div", { className: "tidychat-field-head" }, react.createElement("span", { className: "tidychat-field-label" }, "定位条默认色")), react.createElement("div", { className: "tidychat-color-sub" }, react.createElement("span", { className: "tidychat-color-sub-label" }, "色系"), chipRow([AUTO_OPT, ...NAV_HUE_OPTIONS], String(value.navColor ?? "auto"), (k) => setColor("navColor", k), !writable)), react.createElement("div", { className: "tidychat-color-sub" }, react.createElement("span", { className: "tidychat-color-sub-label" }, "明度"), chipRow(NAV_LIGHT_OPTIONS, String(value.navColorLight ?? "l3"), (k) => setColor("navColorLight", k), !writable || (value.navColor ?? "auto") === "auto")), react.createElement("p", { className: "tidychat-field-hint" }, "自动 = 尊重主题：优先用宿主淡色文字色，与背景对比不足时自动换纠偏灰；手动 = 按「色系 × 5 级明度（极浅→极深）」正交着色。")), react.createElement("div", {
			key: "navAccent",
			className: "tidychat-field"
		}, react.createElement("div", { className: "tidychat-field-head" }, react.createElement("span", { className: "tidychat-field-label" }, "强调色（当前 / 悬停回合）")), react.createElement("div", { className: "tidychat-color-sub" }, react.createElement("span", { className: "tidychat-color-sub-label" }, "色系"), chipRow([ACCENT_AUTO_OPT, ...NAV_HUE_OPTIONS], String(value.navAccent ?? "auto"), (k) => setColor("navAccent", k), !writable)), react.createElement("div", { className: "tidychat-color-sub" }, react.createElement("span", { className: "tidychat-color-sub-label" }, "明度"), chipRow(NAV_LIGHT_OPTIONS, String(value.navAccentLight ?? "l3"), (k) => setColor("navAccentLight", k), !writable || (value.navAccent ?? "auto") === "auto")), react.createElement("p", { className: "tidychat-field-hint" }, "自动 = 跟随主题品牌色；手动 = 当前轮次与悬停 / 导航目标回合以所选强调色高亮。"))) : null), react.createElement("div", {
			key: "report",
			className: "tidychat-report-field"
		}, react.createElement("div", { className: "tidychat-report-tags-label" }, "现象（可多选）："), react.createElement("div", { className: "tidychat-report-tags" }, REPORT_TAGS.map((t) => react.createElement("button", {
			key: t,
			type: "button",
			className: "tidychat-report-tag" + (reportTags.includes(t) ? " tidychat-report-tag-on" : ""),
			onClick: () => setReportTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])
		}, t))), react.createElement("button", {
			type: "button",
			className: "tidychat-report-btn",
			onClick: () => {
				try {
					reportAndOpenIssue(reportTags);
				} catch {}
			}
		}, "📤 生成诊断报告并提交"), react.createElement("p", { className: "tidychat-field-hint" }, "勾选现象后点击：自动生成报告（含检测到的异常）并打开 GitHub 新建 issue 页，检查后提交即可。"))) : null);
	};
	ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
		name: "settings.plugin.item",
		key: "tidychat",
		order: 100,
		inject: () => ({})
	}, TidychatSettingsCard));
}

//#endregion
exports.apply = apply;
exports.inject = inject;
return module.exports; } });