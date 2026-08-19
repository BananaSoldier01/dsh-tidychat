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
function apply(ctx) {
	ctx.effect(() => injectStyle(CSS));
	const listeners = [];
	const notify = () => {
		for (const fn of listeners) fn();
	};
	const foldState = /* @__PURE__ */ new Map();
	let autoLoadCount = 0;
	let autoLoadBusy = false;
	const config = {
		fold: true,
		divider: true,
		navigator: true,
		autoLoad: true
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
		const all = Array.from(document.querySelectorAll("[data-chat-anchor-key]"));
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
			if (label !== null) label.textContent = parts.join(" · ");
			if (btn !== null) btn.textContent = folded ? "展开" : "收起";
		}
	};
	const autoLoadOlder = () => {
		if (!config.autoLoad) return false;
		if (autoLoadBusy || autoLoadCount > 60) return false;
		const btn = Array.from(document.querySelectorAll("button")).find((b) => {
			const t = (b.textContent || "").trim();
			return t === "加载更早" || t === "加载更多" || t.indexOf("Load older") === 0 || t.indexOf("Load more") === 0;
		});
		if (btn === void 0 || btn.disabled) return false;
		autoLoadBusy = true;
		autoLoadCount += 1;
		try {
			btn.click();
		} catch {}
		setTimeout(() => {
			autoLoadBusy = false;
		}, 1200);
		return true;
	};
	const scan = () => {
		try {
			applySurgery();
			autoLoadOlder();
			notify();
		} catch (err) {
			console.error("[dsh-tidychat] 扫描出错", err);
		}
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
				}
			} catch {}
		};
		readConfig();
		try {
			settingsScope.subscribe(() => {
				readConfig();
				scan();
			});
		} catch {}
	}
	scan();
	ctx.effect(() => {
		let pending = null;
		const obs = new MutationObserver(() => {
			if (pending !== null) return;
			pending = setTimeout(() => {
				pending = null;
				scan();
			}, 250);
		});
		obs.observe(document.body, {
			childList: true,
			subtree: true
		});
		const intervalId = setInterval(() => {
			scan();
		}, 5e3);
		return () => {
			obs.disconnect();
			clearInterval(intervalId);
			if (pending !== null) clearTimeout(pending);
		};
	});
	const measurePos = () => {
		const host = document.querySelector("[data-slot=\"conversation.session\"]");
		if (host === null) return null;
		const r = host.getBoundingClientRect();
		if (r.width < 10 || r.height < 10) return null;
		return {
			left: r.left + 4,
			top: r.top + r.height * .5
		};
	};
	const hhmm = (ms) => {
		const d = new Date(ms);
		const pad = (n) => n < 10 ? "0" + n : String(n);
		return d.getMonth() + 1 + "月" + d.getDate() + "日 " + pad(d.getHours()) + ":" + pad(d.getMinutes());
	};
	const findScrollParent = (el) => {
		let p = el.parentElement;
		while (p !== null) {
			if (p.scrollHeight > p.clientHeight + 4) return p;
			p = p.parentElement;
		}
		return null;
	};
	ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
		name: "conversation.session.header.utilities",
		id: "tidychat-nav"
	}, (props) => {
		const [pos, setPos] = react.useState(null);
		const [snapshot, setSnapshot] = react.useState(null);
		const [tip, setTip] = react.useState(null);
		const [hover, setHover] = react.useState(null);
		const [enabled, setEnabled] = react.useState(config.navigator);
		react.useEffect(() => {
			const sid = props.sessionId;
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
			return () => {
				try {
					unsub();
				} catch {}
				const i = listeners.indexOf(refresh);
				if (i >= 0) listeners.splice(i, 1);
			};
		}, [props.sessionId]);
		if (!enabled) return null;
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
		const jumpTo = (index) => {
			const domUsers = Array.from(document.querySelectorAll("[data-chat-anchor-key]")).filter((r) => r.getAttribute("data-chat-flow-kind") === "user");
			const target = domUsers[index];
			if (target !== void 0) target.scrollIntoView({
				behavior: "smooth",
				block: "center"
			});
			else if (domUsers.length > 0) {
				const scroller = findScrollParent(domUsers[0]);
				if (scroller !== null) scroller.scrollTop = 0;
			}
		};
		const barWidth = (i) => {
			if (hover === null) return 16;
			const d = Math.abs(i - hover);
			if (d === 0) return 30;
			if (d === 1) return 22;
			if (d === 2) return 18;
			return 16;
		};
		if (users.length === 0) return null;
		const style = pos === null ? {
			left: "284px",
			top: "50vh"
		} : {
			left: pos.left + "px",
			top: pos.top + "px"
		};
		const rail = react.createElement("div", {
			className: "tidychat-nav-rail",
			style: Object.assign({ transform: "translateY(-50%)" }, style),
			"aria-label": "用户消息定位"
		}, users.map((u, i) => {
			const hot = hover === i;
			return react.createElement("button", {
				key: i,
				className: "tidychat-nav-slot",
				onClick: () => jumpTo(i),
				onMouseEnter: (ev) => {
					setHover(i);
					setTip({
						x: ev.clientX + 18,
						y: ev.clientY - 8,
						num: i + 1,
						time: u.time !== void 0 && u.time !== null ? hhmm(u.time) : "",
						text: u.summary
					});
				},
				onMouseMove: (ev) => setTip((prev) => prev === null ? null : Object.assign({}, prev, {
					x: ev.clientX + 18,
					y: ev.clientY - 8
				})),
				onMouseLeave: () => {
					setHover(null);
					setTip(null);
				}
			}, react.createElement("span", {
				className: "tidychat-nav-bar" + (hot ? " hot" : ""),
				style: { width: barWidth(i) + "px" }
			}));
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
			autoLoad: true
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
				"自动加载更早历史",
				"发现「加载更早」按钮时自动点击，把全部历史纳入折叠与导航。"
			]
		];
		const toggle = (field) => {
			if (settingsScope === null) return;
			const cur = value[field] ?? true;
			settingsScope.set(field, !cur).catch(() => {});
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
		})), react.createElement("p", { className: "tidychat-field-hint" }, hint)))) : null);
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