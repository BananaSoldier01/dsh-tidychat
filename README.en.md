# dsh-tidychat

> [中文](./README.md)

Turn long DSH conversations into a **scannable, skippable** stream of conclusions.

In multi-task sessions, thoughts, tool calls, intermediate text and final summaries pile up, making it hard to find "the conclusion of that last task". dsh-tidychat automatically folds completed turns into a single conclusion line, separates thinking from prose with a divider, and provides a Codex-style navigation rail (Canvas minimap) on the left edge of the conversation — so any session, short or huge, can be browsed globally and jumped around quickly.

> 🔌 Ecosystem: tagged `#dsh` · `#dsh-plugin`, contributions welcome.

## ✨ Features

| Feature | Description |
| --- | --- |
| 🗂 Auto-fold | Completed turns fold away thinking (Think), tool calls and intermediate text, keeping only the final summary; the control bar shows "N steps" and timing (duration / first token / rate) |
| ➖ Divider | A solid line between thinking and prose — one glance separates "process" from "conclusion" |
| 📍 Left-edge Navigation Rail (Adaptive) | Fixed-height Canvas minimap: any number of turns (tens to thousands) map to one viewport; fish-eye hover zoom, drag preview, click-to-jump to the top of the reading area; current turn highlights as you scroll; default color adapts to the background or a manual `hue × lightness` combo, accent (current/hover turn) configurable independently |
| ⬆ Smart earlier-history load | Gradually loads older records while the page is idle; pauses automatically when the page's responsiveness drops, keeping long sessions smooth; manual load still available |
| 📤 One-click issue report | Generates a diagnostic report (version / browser / performance / anomaly detection / symptom tags) and opens a pre-filled GitHub issue — title and body included, zero manual writing |

All features are independent toggles in "Settings → Plugin Configuration", applied instantly; plus a one-click "Generate diagnostic report & submit" entry.

## 📸 Screenshots

**Auto-fold**: completed turns collapse to a control bar with only the final conclusion (top); click "expand" to restore thinking, tool calls and intermediate text (bottom).

<p align="center">
  <img src="./assets/fold-collapsed.png" width="92%" alt="Folded: only the final conclusion">
  <img src="./assets/fold-expanded.png" width="92%" alt="Expanded: full process restored">
</p>

**Left-edge navigation rail (Canvas minimap)**: fixed-height global mapping for any session length; hover fish-eye zoom + summary card (with date/time), drag to preview, click to jump to the top of the reading area.

<p align="center">
  <img src="./assets/navigator.png" width="92%" alt="Left-edge navigation rail and hover summary">
</p>

**Settings panel**: four independent toggles + symptom tags + one-click "Generate diagnostic report & submit", applied instantly.

<p align="center">
  <img src="./assets/settings.png" width="92%" alt="Settings panel with four toggles">
</p>

## 🚀 Install

Prerequisite: DSH (Web) installed, `pnpm` on PATH.

```sh
# Option 1 (recommended): npm package, prebuilt — no allowBuilds approval needed
dsh plugin --profile web add @bananasoldier01/dsh-tidychat

# Option 2: from GitHub (pin a tag for reproducibility)
dsh plugin --profile web add git+https://github.com/BananaSoldier01/dsh-tidychat.git#v0.2.4
```

Restart dsh web + hard refresh (Cmd+Shift+R) after installing.

### Update

The plugin is installed as a profile dependency; updating just re-pulls that dependency (only this plugin, no full DSH re-download):

```sh
# Option A: npm-installed — update directly
dsh plugin --profile web update @bananasoldier01/dsh-tidychat

# Option B: pinned to a tag — re-add pinned to the new tag
dsh plugin --profile web add git+https://github.com/BananaSoldier01/dsh-tidychat.git#v0.2.4
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

### 0.2.3 (released, current) — npm publishing (awesome-dsh-plugin recommended items)

1. **peerDependencies**: `@deepseek-ai/dsh-settings` moved from `dependencies` to `peerDependencies` (host-provided runtime, no duplicate runtimes in the profile)
2. **npm publish**: `prepublishOnly` auto-builds; `@bananasoldier01/dsh-tidychat@0.2.3` is public (prebuilt — install skips `allowBuilds`); recommended install is now `dsh plugin add @bananasoldier01/dsh-tidychat`
3. **Listing**: awesome-dsh-plugin submission PR submitted (#3067, session category + screenshots), awaiting maintainer merge

### 0.2.4 (released, current) — npm package metadata refresh

No functional changes — npm package content only: `README.en.md` bundled, `repository.url` normalized (`npm pkg fix`), bilingual README shipped. The awesome-dsh-plugin listing PR #3067 has merged (session category + screenshots).

### Next (candidates)

1. **Turn Index layer** — conversation DOM → Turn Index (id/element/position/summary), shared by fold/navigator/autoload, replacing full rescans; incremental maintenance once real 500+/1000+ turn data is available.
2. **Folding completed in-flight steps** (issue #2) — within a single turn that runs many actions, fold completed steps live. Demand TBD.

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
- **Left-edge navigation rail**: thin rail on the left edge; hover shows summary, click jumps to the message.
- **Smart earlier-history load**: gradually loads older records while idle; pauses when responsiveness drops; manual load remains available.
- **Colors (advanced, collapsible)**: two groups, each a `hue × lightness` orthogonal config. **Default color** auto = host muted label, corrective gray when contrast vs the chat background is insufficient (light on dark, dark on light); manual hues: gray/black/white/blue/violet/cyan/green/orange/red with lightness l1 (lightest) → l5 (deepest). **Accent** controls the current + hover/jump-target turn highlight; auto (default) = theme brand color (`--dsw-alias-state-business-primary`).

## 🔧 How it works

Pure browser half (`exports "./client"`); the host half only registers the settings namespace — no DSH source modifications:

- Fold / divider / navigation locate DOM via contract-level anchors (`data-chat-anchor-key`, `data-variant="think"`, etc.), not compile-time hashed class names;
- A `MutationObserver` watches the conversation DOM, with a periodic fallback scan, handling streaming renders and history loads;
- Fold state is in-memory per session — refresh resets to defaults (all folded).

## 🧑‍💻 Development

```sh
pnpm install
pnpm run build      # tsdown builds lib/
pnpm run typecheck
```

## 📄 License

MIT
