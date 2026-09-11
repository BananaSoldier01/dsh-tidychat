# dsh-tidychat

> [中文](./README.md)

> **▼ DSH version compatibility**
> | DSH version | settings registration | Fold / divider / auto-load | Navigation rail |
> | --- | --- | --- | --- |
> | 0.1.0-rc.7 / 0.1.1-rc.x | `register` (v0.2.7+) / `installSettingsSection` (v0.2.5) | ✅ fold/divider/auto-load work (v0.2.8+ falls back to anchor-key; v0.2.7 doesn't) | ✅ available (navigator on; old slot + anchors present; no official rail to take over) |
> | 0.1.2-alpha.2+ / 0.1.2-rc.1 | `installSection` | ✅ works | ✅ available since v0.2.10 — just turn on "Take over the official rail" |
>
> - **Settings auto-adapts**: the plugin picks the registration API per host version — `installSection` on 0.1.2+, `register` on 0.1.0-rc.7 / 0.1.1-rc.x — so the same plugin loads and registers its toggles across **DSH 0.1.0-rc.7 → 0.1.2-rc.1**.
> - **Navigation rail**: since DSH 0.1.2 the host ships its own right-edge TurnNavigator, which overlaps this plugin's rail. **v0.2.10 adds a "Take over the official rail" toggle** (default **off**): turning it on hides the official right-edge rail so this plugin's rail takes over — dockable left or right (right mirrors it), with a "line / dot" display style and a separate "ring" toggle. The toggle is off by default, so nobody's official behaviour changes silently.
>   - ⚠️ The official rail is **hidden, not unmounted**: the host exposes no native switch, so the plugin cannot make the official component "logically off". With takeover on the official component stays mounted (its DOM remains) — what stops is painting, layout, interaction and scroll-following.
> - **Fold / divider**: v0.2.8+ also works on old DSH — when `data-chat-turn` is absent it falls back to parsing the turn from `data-chat-anchor-key` (v0.2.5's approach). v0.2.7 lacked this fallback, so its fold/divider were broken on old DSH (auto-load worked).
> - **Feature overlap**: since DSH 0.1.2 the host natively folds process content + System prompt and adds a right-edge TurnNavigator, overlapping the plugin's fold / rail.
> - **Usage recommendation**:
>   - **DSH 0.1.2+**: pick one with the native fold — if you use the native fold, disable the plugin's fold (avoid double-folding); if you want the plugin's fold control bar, disable the native fold. To use this plugin's own rail, turn on "Take over the official rail" — otherwise you will see two rails, one on each edge.
>   - **DSH ≤ 0.1.1-rc.x**: the rail is available (navigator on); fold/divider/auto-load also work on v0.2.8+.

Turn long DSH conversations into a **scannable, skippable** stream of conclusions.

In multi-task sessions, thoughts, tool calls, intermediate text and final summaries pile up, making it hard to find "the conclusion of that last task". dsh-tidychat automatically folds completed turns into a single conclusion line and separates thinking from prose with a divider; the Codex-style navigation rail (Canvas minimap) docks to either edge, and with the "Take over the official rail" toggle it replaces the host's right-edge TurnNavigator on **DSH 0.1.2+** (on older DSH there is no official rail, so it just works).

> 🔌 Ecosystem: tagged `#dsh` · `#dsh-plugin`, contributions welcome.

## ✨ Features

| Feature | Description |
| --- | --- |
| 🗂 Auto-fold | Completed turns fold away thinking (Think), tool calls and intermediate text, keeping only the final summary; the control bar shows "N steps" and timing (duration / first token / rate) |
| ➖ Divider | A solid line between thinking and prose — one glance separates "process" from "conclusion" |
| 📍 Navigation rail (Adaptive) | Global navigation along the chat edge, dockable **left or right** (right mirrors everything: the accent arrow points left, the hover summary opens to the left). Fixed-height Canvas minimap mapping any turn count; fish-eye hover, drag preview, click-to-jump, current-turn highlight. Two display styles: **line** / **dot**; plus a separate **ring** toggle (an accent outline around the current and hovered marks). Colour auto-adapts, or custom via a colour picker (HEX/RGB input + alpha). On **DSH 0.1.2+ you must turn on "Take over the official rail"**, otherwise it coexists with the host's right-edge rail |
| 🎛 Take over the official rail | Hides DSH 0.1.2+'s native right-edge TurnNavigator so this plugin's rail takes over. **Off by default.** Note: it hides rather than unmounts — the official component stays mounted (the host offers no native switch) |
| ⬆ Smart earlier-history load | Gradually loads older records while the page is idle; pauses automatically when the page's responsiveness drops, keeping long sessions smooth; manual load still available |
| 📤 One-click issue report | Generates a diagnostic report (version / browser / performance / anomaly detection / symptom tags) and opens a pre-filled GitHub issue — title and body included, zero manual writing |

Fold / divider / smart early-history load / take-over-the-official-rail are independent toggles in "Settings → Plugin Configuration", applied instantly; the rail itself has three more controls — "Position" (left / right), "Style" (line / dot) and "Ring" (off / on). Also includes a one-click "Generate diagnostic report & submit" entry.

## 📸 Screenshots

**Auto-fold**: completed turns collapse to a control bar with only the final conclusion (top); click "expand" to restore thinking, tool calls and intermediate text (bottom).

<p align="center">
  <img src="./assets/fold-collapsed.png" width="92%" alt="Folded: only the final conclusion">
  <img src="./assets/fold-expanded.png" width="92%" alt="Expanded: full process restored">
</p>

**Navigation rail (Canvas minimap)**: dockable left or right, style line / dot, ring independently toggleable. The image below was taken on old DSH without the official right-edge TurnNavigator (since v0.2.10 the same works on DSH 0.1.2+ once "Take over the official rail" is on).

<p align="center">
  <img src="./assets/navigator.png" width="92%" alt="Navigation rail and hover summary">
</p>

**Settings panel**: four independent toggles (including "Take over the official rail") + rail position/style/ring + symptom tags + one-click "Generate diagnostic report & submit", applied instantly.

<p align="center">
  <img src="./assets/settings.png" width="92%" alt="Settings panel">
</p>

## 🚀 Install

Prerequisite: DSH (Web) installed, `pnpm` on PATH.

```sh
# Option 1 (recommended): npm package, prebuilt — no allowBuilds approval needed
dsh plugin --profile web add @bananasoldier01/dsh-tidychat

# Option 2: from GitHub (pin a tag for reproducibility)
dsh plugin --profile web add git+https://github.com/BananaSoldier01/dsh-tidychat.git#v0.2.10
```

Restart dsh web + hard refresh (Cmd+Shift+R) after installing.

### Update

The plugin is installed as a profile dependency; updating just re-pulls that dependency (only this plugin, no full DSH re-download):

```sh
# Option A: npm-installed — update directly
dsh plugin --profile web update @bananasoldier01/dsh-tidychat

# Option B: pinned to a tag — re-add pinned to the new tag
dsh plugin --profile web add git+https://github.com/BananaSoldier01/dsh-tidychat.git#v0.2.10
```

Restart dsh web + hard refresh after updating.

> ⚠️ **Making settings writable (only DSH ≤ 0.1.0-rc.6)**: rc.6 and earlier hardcode the plugin-namespace whitelist in the host build, so third-party switches appear greyed out. Run this to add `tidychat` to the whitelist (idempotent; re-run after DSH upgrades):
>
> ```sh
> curl -sL https://raw.githubusercontent.com/BananaSoldier01/dsh-tidychat/main/scripts/whitelist-patch.sh | bash
> ```
>
> **Not needed for DSH ≥ 0.1.0-rc.7**: rc.7 removed the whitelist; namespaces register dynamically and switches work out of the box.

> 💡 **Compatibility**: `0.2.0`+ supports **DSH ≥ 0.1.0-rc.7** (incl. 0.1.1-rc.x; contract points verified on rc.1/rc.2). rc.7 changed `settings.plugin.item` from a list to keyed slots (`id` → `key`); the old form errors with "Failed to load plugins". Use **`0.1.0` for DSH ≤ 0.1.0-rc.6**.

## 🗺️ Roadmap

### 0.2.0 (released) — Adaptive Conversation Navigation Rail

The rail upgraded from a fixed list to a **Canvas-minimap global navigator**:

1. **Fixed height**: `min(70vh, 660px)` — any turn count (20/70/200+) maps into the same viewport
2. **Uniform global mapping**: `y = index/(total-1) × railHeight`, no DOM growth with turn count (1 canvas + 1 tip card)
3. **Fish-eye hover**: ±4 turns near the cursor zoom, distant ones compress; hit-testing and rendering share one layout function
4. **Drag scrubbing**: preview the target while dragging, jump on release
5. **Current-turn highlight**: anchored to the top of the reading area (incl. header offset), updated with scroll
6. **Precise jump**: user messages scroll to the top of the reading area (not viewport center, not buried in the header)
7. **Compatibility**: fold / divider / autoload / diagnostics unaffected (rail data comes from the session snapshot, independent of fold CSS hiding)

### 0.2.1 (released) — Rail color polish (PR #5 merged)

1. **True background bubbling**: auto color walks up the parent chain from the scroll container for the first non-transparent background (alpha=0 skipped), instead of a fixed candidate set
2. **Auto respects the theme**: default auto uses the host's muted label color when its contrast vs the real background is ≥3:1, else a corrective gray; accent auto (default) = theme brand color (`--dsw-alias-state-business-primary`)
3. **Colors collapsed as an "advanced" section** in settings; lightness tier disabled while auto
4. **Enumerated config**: the four color fields are `z.union` enums; temporary `:root` variables cleaned on unload

### 0.2.2 (released) — Tooltip readability (issue #6)

1. **Head tier lift**: tooltip `#num · time` from the weakest tier (`label-tertiary`) to `label-secondary`, no longer washed out on light backgrounds; body follows `label-primary` (same color as conversation text), auto light/dark
2. **Conservative contrast fallback**: only when the tooltip backdrop is opaque (`bg-layer-3` alpha ≥ 0.85) and label tokens contrast <3:1 does it write a corrective color (dark text on light, light on dark); glassy/translucent backdrops (official dark mode etc.) always skip and follow theme tokens — no misjudging dark glass
3. **Long summaries wrap**: `overflow-wrap: anywhere` keeps long code/URLs inside the card
4. **Parser hardening**: color parsing supports `rgba` comma / space+slash syntax, `#rgb/#rgba/#rrggbb/#rrggbbaa`, `transparent`

### 0.2.3 (released) — npm publishing (awesome-dsh-plugin recommended items)

1. **peerDependencies**: `@deepseek-ai/dsh-settings` moved from `dependencies` to `peerDependencies` (host-provided runtime, no duplicate runtimes in the profile)
2. **npm publish**: `prepublishOnly` auto-builds; `@bananasoldier01/dsh-tidychat@0.2.3` is public (prebuilt — install skips `allowBuilds`); recommended install is now `dsh plugin add @bananasoldier01/dsh-tidychat`
3. **Listing**: awesome-dsh-plugin submission PR submitted (#3067, session category + screenshots), awaiting maintainer merge

### 0.2.4 (released) — npm package metadata refresh

No functional changes — npm package content only: `README.en.md` bundled, `repository.url` normalized (`npm pkg fix`), bilingual README shipped. The awesome-dsh-plugin listing PR #3067 has merged (session category + screenshots).

### 0.2.5 (released) — Hardening

1. **Fold-state session isolation (P0)**: `foldState` now `Map<sessionId, Map<turn, boolean>>` — fixes cross-session bleed (expanding turn 5 in session A no longer leaves session B's turn 5 unexpectedly expanded)
2. **Pointermove throttling**: high-frequency moves record the latest coordinates and process once per frame via rAF (no more React render per event); pending frames cancelled on leave/unmount
3. **No render before measurement**: when host layout is not ready (`pos === null`), the rail no longer renders at the hardcoded 280px guess position — it appears once measurement succeeds
4. **Snapshot/DOM turn-consistency check**: the report now compares session-snapshot turns with DOM turns and flags mismatches (loading or DOM lag)
5. Version pins updated; package description now lists all four features

### 0.2.6 (released) — Fold & divider redo; left rail paused

1. **Fold redo (Codex-style)**: only folds thinking (Think) + tool calls, keeping the user message and the final formal reply; the control bar is "duration X + arrow + divider", whole bar clickable, arrow points right when folded and down when expanded; a separate divider is drawn between process and reply.
2. **Divider redo**: the process/reply boundary now uses an inline divider (drawn via the thinking chip's `::after`, survives React re-renders) and is darkened to `rgba(96,96,96,0.85)` for better contrast.
3. **⚠️ Left rail paused**: since DSH 0.1.2-rc.1 the host natively adds a right-edge TurnNavigator and native fold, overlapping the plugin's left rail; the rail also depends on `react-dom` (not provided by the plugin or host). So from this version the **left-edge rail is not shown**. Whether to keep it, or rework it to work with the official navigator/fold, is deferred to a future version (source and historical screenshots retained).
4. **Fold retry notices too (issue #8)**: the host renders a retried model request as a `model-retry` row ("已重试模型请求"), which was not folded before. Since this version `model-retry` is treated as process noise and folded together with thinking/tool calls.

### 0.2.7 (released) — Settings API backward compatibility

1. **Settings registration auto-adapts**: the host chooses the right API per DSH version — `installSection` on 0.1.2+, `register` on 0.1.0-rc.7 / 0.1.1-rc.x — so the same plugin loads and registers its settings toggles across **DSH 0.1.0-rc.7 → 0.1.2-rc.1** (0.2.6 relied on the 0.1.2 `installSection`, which made old DSH report "Failed to load plugins").
2. **Left rail**: still conflicts with the official feature and depends on `react-dom`; remains paused (this compatibility change does not restore it).

### 0.2.8 (released) — Full plugin works on old DSH (no right TurnNavigator)

1. **Fold/divider fallback**: when `data-chat-turn` is missing (old DSH 0.1.0-rc.7 ~ 0.1.1-rc.x), the fold grouping falls back to parsing the turn from `data-chat-anchor-key` (v0.2.5's approach), so fold/divider also work on old DSH (0.1.2+ still uses `data-chat-turn`, unchanged).
2. **Left rail confirmed available**: old DSH has no official right TurnNavigator; the `conversation.session.header.utilities` slot exists and is rendered, and the needed DOM anchors are all present (confirmed from the 0.1.1-rc.2 source) — so the left rail works on **old DSH (0.1.0-rc.7 ~ 0.1.1-rc.x, navigator on)**; it stays paused on DSH 0.1.2+ because of the official right TurnNavigator.

### 0.2.9 (released) — Color picker + stale-fold-mark fix

1. **Color picker**: the rail's default color / accent now offer auto / custom instead of the `hue × lightness` chips; custom = native picker (continuous) + HEX/`rgb()`/`rgba()` input + alpha slider, with a live swatch. Host schema gains `navColorCustom` / `navAccentCustom` (legacy hue values still resolve).
2. **Stale fold mark fix (likely root cause of issue #12)**: `applyFold` only walked the rows it folds *this* pass, so a row that flipped from "fold whole" to "fold think only" kept its old `data-tidychat-folded` and stayed hidden (including the final answer) until a page reload. Each pass now clears the marks first, then re-applies them (same JS task, no flicker). Also fixes hidden rows staying hidden after turning fold off.
3. **Tooltip text color fix** (PR #9, issue #11): double-class + `!important` on `.tidychat-nav-tip`, and `applyTipContrast()` now reads tokens from `document.body` (DSH defines `--dsw-alias-*` on body, not html).

### 0.2.10 (current) — Take over the official rail + rail style polish

1. **New "Take over the official rail" toggle** (default **off**): hides the host's native right-edge TurnNavigator on **DSH 0.1.2+** so this plugin's rail takes over. The rail is now usable across the whole **0.1.0-rc.7 → 0.1.2-rc.1** range.
   - It **hides rather than unmounts**: the host exposes no native switch, so the plugin cannot stop the official component from mounting. Hiding is done with a root attribute (`data-tidychat-hide-official-nav`) plus a CSS rule, which React re-renders cannot undo; turning the toggle off removes the attribute and the official rail reappears immediately.
   - The selector does **not** hardcode the official CSS-module hash (`eGxaPq_*` changes between builds). It anchors on three things: the local-name substring, the structure, and the inline `--turn-natural-position` variable the official code writes for every turn.
   - With takeover on the official component stays mounted, but painting, layout, interaction and scroll-following all stop. Hiding only ever *reduces* work — it adds none.
2. **New "Ring" style toggle** (default **off**): draws an accent outline (1px stroke, offset 2px) around the current and hovered marks — a capsule for the line style, a true circle for the dot style. Its colour follows the existing accent, so no new colour setting is introduced.
3. **Fixed the "vertical bar" mislabel — it is a line**: the display-style option had always read "vertical bar", but the drawing code is `fillRect(x, y, width, height)` with a width (14–26px) far greater than its height (3px) — it was **always a horizontal line**, and the repo has never contained any vertical-line drawing code. The option label, comments and settings hint now all say "line", matching the README's existing "thin rail" wording. Both styles (line / dot) have **zero changes** to their drawing code.
4. **Corrected the unsupported "depends on `react-dom`" claim**: `git grep react-dom` finds nothing in the source, and the only `require()` argument in the built bundle is `react`; the rail only uses `useState`/`useRef`/`useEffect`/`createElement`. The claim came from a temporary DOM implementation that was already deleted before v0.2.6 — stale misdiagnosis, now corrected.

> 📌 **Spare mainline `shadow/main`**: points at `upstream/main` (the pristine v0.2.9 mainline; `--unset-upstream` so it cannot be pushed by accident). Purpose: `feat/rail-mirror-and-dots` (left/right mirroring + dot style, 5 commits) has not been accepted upstream — if it never merges, this is the clean mainline to restart from.
>
> ⚠️ **Measured: cherry-picking the whole commit onto `shadow/main` needs manual conflict resolution** (2 blocks in `src/index.ts`, 9 in `src/client/index.ts`) — the 0.2.10 changes interleave with that feature inside the same files. The conflicts are all small (config fields, a settings entry, around the drawing loop), but it is **not** a one-command operation. If you need a "no feature + official-rail takeover" build, start from `shadow/main` and port the takeover by hand: the CSS rule, `applyOfficialNavTakeover()`, the two config fields (`hideOfficialNav` / `navRing`), and one settings entry.

### Next (candidates)

1. **Turn Index layer** — conversation DOM → Turn Index (id/element/position/summary), shared by fold/navigator/autoload, replacing full rescans; incremental maintenance once real 500+/1000+ turn data is available.
2. **Folding completed in-flight steps** (issue #2) — within a single turn that runs many actions, fold completed steps live. Demand TBD.
3. **Upstream issue**: ask DSH to expose a switch (or slot override) for its native TurnNavigator so third-party plugins can truly "turn it off" instead of only hiding it; and to consider narrowing rail items from "the whole session outline" to "the loaded window + lazy loading" to cut mark counts on very long sessions.

### Local dev (link mode)

```sh
git clone https://github.com/BananaSoldier01/dsh-tidychat.git
cd dsh-tidychat
pnpm install
dsh plugin --profile web add link:$PWD
```

After editing: `pnpm run build`, then restart dsh web / hard refresh.

## ⚙️ Settings

Expand the **dsh-tidychat** card in "Settings → Plugin Configuration":

- **Auto-fold completed turns**: hides thinking, tool calls and intermediate text, keeps only the final conclusion; control bar shows timing.
- **Thinking ↔ text divider**: solid line between the thinking row and body text.
- **Navigation rail**: thin rail along the chat edge; hover shows summary, click jumps to the message; position and style are adjustable below.
- **Take over the official rail** (default off): hides DSH 0.1.2+'s native right-edge TurnNavigator so this plugin's rail takes over. It is a **hide, not an unmount** — the official rail stays mounted; do not enable it while the rail itself is off, or you will have no rail at all.
- **Smart earlier-history load**: gradually loads older records while idle; pauses when responsiveness drops; manual load remains available.
- **Position**: `left` / `right (mirrored)`. On the right everything mirrors — the line grows leftwards from the right edge, the accent arrow points left, and the hover summary opens to the left of the cursor.
- **Style**: `line` / `dot`. Both keep the fish-eye zoom (marks near the cursor grow) and click-to-jump.
- **Ring** (default off): draws an accent outline (1px stroke, offset 2px) around the current and hovered marks; a capsule for the line style and a true circle for the dot style. Its colour follows the accent below.
- **Colors (advanced, collapsible)**: **default color** and **accent** each offer auto / custom. **Auto**: the default color uses the host muted label, switching to a corrective gray when contrast vs the chat background is insufficient; the accent follows the theme brand color (`--dsw-alias-state-business-primary`). **Custom**: pick any color with the color picker (continuous), or type an exact HEX / `rgb()` / `rgba()` value, plus an alpha slider. The **accent** drives the current + hover turn highlight and is also the ring's stroke colour.

## 🔧 How it works

Pure browser half (`exports "./client"`); the host half only registers the settings namespace — no DSH source modifications:

- Fold / divider / navigation locate DOM via contract-level anchors (`data-chat-anchor-key`, `data-variant="think"`, etc.), not compile-time hashed class names;
- A `MutationObserver` watches the conversation DOM, with a periodic fallback scan, handling streaming renders and history loads;
- Fold state is in-memory per session — refresh resets to defaults (all folded);
- "Take over the official rail" also avoids build-time hashes: the official TurnNavigator's class names are CSS-module artifacts (`<hash>_slot` / `<hash>_frame`), so the plugin anchors on a **local-name substring + structure + the inline `--turn-natural-position` variable the official code writes for every turn**. Turning it off simply removes the `data-tidychat-hide-official-nav` attribute from the root element.

## 🧑‍💻 Development

```sh
pnpm install
pnpm run build      # tsdown builds lib/
pnpm run typecheck
```

## 📄 License

MIT
