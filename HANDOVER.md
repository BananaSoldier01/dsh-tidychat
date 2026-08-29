# dsh-tidychat 交接文档（HANDOVER）

> 面向：接续开发的新会话 / 新协作者。内容基于 **v0.2.5（main @ 4bc374f）** 快照。仓库根目录：`/Users/wuke/工作文件/DeepSeek_Harness/dsh-tidychat`（本机 link 模式开发）。

---

## 0. 一句话背景

`dsh-tidychat` 是一个 **DSH（DeepSeek Harness）Web 插件**：把长会话整理成「可扫读、可跳转」的结论流——四个独立开关：自动折叠已完成轮次、思考↔正文分隔线、左缘定位条（Canvas minimap 全局导航）、智能加载更早历史；外加「生成诊断报告并提交 GitHub issue」一键入口。

- 仓库：https://github.com/BananaSoldier01/dsh-tidychat（owner：BananaSoldier01）
- npm：`@bananasoldier01/dsh-tidychat`（public，最新 **0.2.5**）
- 插件索引：**awesome-dsh-plugin 已收录**（PR #3067 合并，session 分类 + 截图），即 dsh-market 源
- 当前版本线：v0.2.0 → v0.2.5（0.2.0 导航条大版本；0.2.1 配色；0.2.2 提示卡可读性；0.2.3 配色/publish 准备；0.2.4 npm 元数据；0.2.5 Hardening）

---

## 1. 项目目录

```
dsh-tidychat/
├── src/
│   ├── index.ts              # host 半：settings 命名空间注册 + z<Config> schema（z.union 枚举）
│   └── client/
│       └── index.ts          # 浏览器半：全部逻辑（1597 行单文件，尚未拆分）
├── lib/                      # 构建产物（git 跟踪！link 模式实际被服务的就是它）
│   ├── index.js              # host 半产物
│   └── client.js             # 浏览器半产物（~59 kB）
├── assets/                   # 效果图：fold-collapsed/expanded.png、navigator.png、settings.png
├── screenshots.json          # awesome-dsh-plugin 新约定：本仓库声明截图（相对路径数组）
├── scripts/whitelist-patch.sh # DSH ≤ rc.6 的 settings 白名单补丁（幂等）
├── .github/ISSUE_TEMPLATE/   # bug_report.yml / feature_request.yml
├── cordis.patch.yml          # dsh.bundle 的 patch 声明
├── package.json              # 0.2.5；dsh.bundle 清单；peerDependencies（dsh-settings/react）
│                             # dependencies 仅 schemastery；files 白名单；prepublishOnly=pnpm build
├── tsdown.config.ts          # 构建配置；用 createRequire 读 package.json 版本 → __PLUGIN_VERSION__
├── tsconfig.json
├── README.md                 # 中文默认（npm/GitHub 首页展示）
├── README.en.md              # 英文全量版；两文件顶部互链
├── HANDOVER.md               # 本文件
└── LICENSE (MIT)
```

**相关外部目录（本机）**：
- 插件注册（link 模式）：`~/.dsh/profiles/web/node_modules/@bananasoldier01/dsh-tidychat` → 软链到上述仓库
- awesome-dsh-plugin 工作克隆：`/Users/wuke/工作文件/DeepSeek_Harness/awesome-dsh-plugin`（fork = BananaSoldier01/awesome-dsh-plugin，上游 remote = awesome-dsh-plugin/awesome-dsh-plugin，投稿分支 add/tidychat 已合并）

---

## 2. DSH 契约点（已验证 0.1.0-rc.7 → 0.1.1-rc.2 稳定）

- `settings.plugin.item`：**keyed 槽**（rc.7 起由 list 改为 keyed），注册必须 `key: 'tidychat'`（同命名空间），旧 `id` 写法会报 "Failed to load plugins"
- `conversation.session.header.utilities`：子槽列表，导航条组件注册 `id: 'tidychat-nav'`（order 100）
- DOM 锚点：`data-chat-anchor-key`、`data-chat-flow-kind`（user / think / context …）、`data-variant="think"`、`[data-conversation-scroll]`、`[data-composer-card]`
- `conversationContextKey` = `${kind.length}:${kind}${id}`
- API：`settingsScope.bind({ namespace: 'tidychat' })`、`ctx.sessions.binding(sid)`、`installSettingsSection(ctx, ns, schema, entry, hooks)`
- 语义色 token：`--dsw-alias-label-primary/secondary/tertiary/caption`、`--dsw-alias-bg-layer-3`、`--dsw-alias-state-business-primary`、`--dsw-alias-border-l2`

---

## 3. src/client/index.ts 关键结构（以 v0.2.5 行号为参考，会随改动漂移）

| 区域 | 内容 |
|---|---|
| ~1-280 | CSS 注入（折叠/分隔/定位条/提示卡/设置卡样式） |
| ~378-410 | **foldState**（`Map<sessionId, Map<turn, boolean>>`，0.2.5 会话隔离）+ AutoLoad Governor 常量/状态 + `activeSessionId` |
| ~420-600 | 主扫描 `scan()`：收集 turns → `applySurgery`（分隔线/折叠控制条）→ `applyFold` |
| ~610-760 | Smart AutoLoad Governor（`isGovernorBusy/scheduleNext/loadOnePage/pause`；软预算时间制） |
| ~810-900 | 诊断：`snapshotUserTurns()`、`detectIssues()`、`buildReport()`、`reportAndOpenIssue()`（异常检测 + 剪贴板 + 预填 issue） |
| ~900-1010 | 颜色链：`parseRgba/parseRgb`、`findBackgroundRgb`（简单冒泡）、`isDarkBackground`、`contrastRatio`、`resolveNavColors`、`applyTipContrast`（保守兜底）、`applyNavColors`（写 `--tidychat-nav-*` 变量） |
| ~1120-1450 | RailView React 组件（measurePos/layoutPositions/indexFromY/railHeight/rowCache/detectCurrent/jumpTo/pointer rAF 节流/tip 提示卡） |
| ~1460-1600 | 设置卡片（TidychatSettingsCard：4 开关 + 配色高级折叠 + 诊断报告按钮） |

---

## 4. 重要设计原则（历次讨论沉淀，改代码前先读）

1. **主题/颜色只跟随 DSH 语义 token，禁绝新增主题检测机制**：不做 `prefers-color-scheme` / `body[data-ds-dark-theme]` 硬编码。导航条 auto 与提示卡都只做「**保守兜底**」：仅在浮层背景**不透明**（alpha ≥ 0.85）且 token 与背景对比 <3:1 时才纠偏；**玻璃/半透明背景（如官方深色 `rgba(255,255,255,0.1)`）一律跳过，token 跟随**。
   - 历史教训（勿重蹈）：0.2.2 前期把半透明白当浅底 → 官方深色「暗底暗字」；后来加 alpha 合成 → 深蓝主题仍误判。最终方案 = 纯 token 跟随 + 不透明时才兜底。
2. **默认行为不得回归**：用户实测过「官方深/浅、玻璃皮肤、异常 token 皮肤」的明暗正确性，任何改动别破坏「跟随正文颜色」的直觉（`label-primary`/`label-secondary`）。
3. **工程收口优先于加功能**（GPT 评审结论，用户已采纳方向）：0.2.5 已做 foldState 隔离、rAF 节流、测量前不渲染、快照/DOM 一致性诊断；**纯函数抽取 + 单测 + CI 明确推迟到 0.3.0 前置**（理由：函数都在 `apply()` 闭包内、依赖活的 `config`，抽取需参数化；绝不能边移动边改逻辑——对比度/alpha 阈值是最容易出回归的领域）。
4. **版本节奏**：小修小补 0.2.x，新功能线 0.3.0（Contextual Follow-up，尚未开始）；README 路线图每个版本更新（章节 + 上一版标「已发布」+ 钉版示例 `#vX.Y.Z`），双语同步。
5. **社区约定**：截图声明在**本仓库** `screenshots.json`（相对路径数组）；给 awesome-dsh-plugin 提 PR 时 fork main 必须与上游同步、README 由 `scripts/generate-readme.mjs` 生成（不手编）。

---

## 5. 开发 / 发布流程

### 开发（link 模式，即时生效）
```sh
pnpm install && pnpm run build   # 产出 lib/
# GUI：http://127.0.0.1:3080（浏览器），改完源码 pnpm build 后 Cmd+Shift+R 硬刷新
# 注意：bundle 无版本标记，别用版本号判断是否更新；验证项 → F12 Console：
#   typeof (window).__tidychatReport === 'function'  # 插件已注入
```

### 发布（每版固定 7 步）
1. 改代码 → `pnpm typecheck && pnpm build`
2. `package.json` bump；README 双语：路线图加新章节、上一版标「已发布」、钉版示例改新版本号
3. `git commit` + `git push origin main`
4. `git tag -a vX.Y.Z -m "…"` + `git push origin vX.Y.Z`
5. `gh release create vX.Y.Z --title … --notes …`
6. **`npm publish --access public`**（⚠️ **必须带 `--access public`**，否则 E402 私有包拦截；本机 ~/.npmrc 的 bypass-2FA token **只允许 publish**，unpublish / access 变更会 403——那类操作需普通 `npm login` + OTP）
7. 验证：`npm view`/curl registry —— **注意注册表约 2-3 分钟传播延迟**，成功消息后 packument 可能仍显示旧版本，稍候重试即可。

---

## 6. 测试速查（无头）

- 颜色决策矩阵的自动化验证法（Node + `--experimental-strip-types` 从源码提取真实函数再跑用例）——上次 10/10 用例见对话记录，可复用
- playwright-core 无头测试：装在 `/tmp/pwtest`（临时，重装即可）；headless 客户端**无法打开正在运行的会话**（只能打开旧会话，且能看到 DOM 但插件悬停工具链受限）——UI 目检最终仍需人工
- 决策矩阵关键用例（新增颜色逻辑时必须回归）：官方深色玻璃 SKIP、官方浅色 OK、异常不透明 token 皮肤 FIX、玻璃/color-mix SKIP、hex8/空格+斜杠 格式解析
- 常规目检清单：官方明/暗、玻璃皮肤、异常 token 模拟（console 覆写 `--dsw-alias-bg-layer-3`/`label-primary/secondary`）、悬停提示卡、折叠控制条、跨会话展开串扰、诊断报告

---

## 7. 待办 / 路线图（截至 v0.2.5）

- **0.3.0 Contextual Follow-up**（用户已选中，未开工）：选中 Assistant 最终正文 → 浮出「添加到对话」→ Composer 上方引用卡片 → 发送时携带引用。V1 严格限定：只支持 Assistant 最终正文；内部抽象 `SelectionReference`（sessionId / anchorKey / selectedText / sourceType）
- **0.3.0 前置**：纯函数抽取（parseRgba/contrastRatio/layoutPositions/indexFromY/cleanTiming 等）+ vitest 单测 + GitHub Actions（install/typecheck/test/build）
- **TurnSnapshot → Incremental Turn Index**：推迟，等真实 500+/1000+ 轮数据（README 路线图已注明）
- **issue #2**：运行中回合的已完成步骤折叠（需求强度待验证）
- 大方向判断（GPT 评审共识）：**别再堆「会话管理小功能」**（搜索/Bookmark/Token 统计等），主线是 **Long Conversation UX**：少看无关过程 → 快速定位历史 → 针对具体内容继续交流

---

## 8. 社区与 issue 现状

- issue：#1–#4 已关（模板/修复），#6 已关（0.2.2 修复 + 回复），#7 已关（投稿感谢）
- PR：#5（drscrewdriver 配色）已合并；#3 早期合并；awesome-dsh-plugin #3067 已合并
- 贡献者：drscrewdriver（PR #5、issue #4/#6/#7）；维护者 = BananaSoldier01
- 投稿 fork：`/Users/wuke/工作文件/DeepSeek_Harness/awesome-dsh-plugin`（已合并；将来再投稿先 `git fetch upstream && git rebase upstream/main`）
