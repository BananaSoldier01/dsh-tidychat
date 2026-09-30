/**
 * dsh-tidychat host 半：声明式配置 schema，让设置面板能可视化开关全部功能。
 * 实际功能全部在浏览器半（exports "./client"）。
 *
 * DSH 0.2.x（自 0.1.7 起）settings 为声明式：本插件不再注册任何命名空间。
 * Config 中标 .volatile() 的字段由宿主设置面板自动渲染成表单。
 * .volatile() 由 @deepseek-ai/schemastery ^3.18.4 提供；0.1.6 及更旧宿主上
 * 调用会抛 TypeError，故本线（0.4.0+）只支持 DSH 0.2.x。
 * 0.1.0-rc.7 ~ 0.1.6 请使用插件 0.3.1。
 *
 * 宿主侧不消费配置值（仅声明 schema，apply 为空实现，无需订阅
 * loader/volatile-update）。浏览器半经 configForms 读取同一 entry 配置并即时生效，
 * 设置卡挂在 settings.plugins.tab（设置 → 内置插件）。
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

/** 设置命名空间（浏览器半按该 id 读取；0.2 上即 profile entry 的 local id）。 */
export const TIDYCHAT_SETTINGS_NAMESPACE = 'tidychat' as const

/**
 * 插件配置。运行时（apply 收到的组合条目里）标 volatile 的字段是宿主下发的
 * live 引用（Volatile<T>，读值需 .get() 解引）；宿主侧不消费，故类型保持
 * 面向用户的普通值形态。
 */
export interface Config {
  /** 已完成轮次自动折叠（思考/工具调用/中间文字，只留最终结论）。 */
  fold?: boolean
  /** 思考行与文字之间的分隔线。 */
  divider?: boolean
  /** 左缘 Codex 式用户消息定位条。 */
  navigator?: boolean
  /** 接管官方右缘消息轨：开启后隐藏 DSH 原生 TurnNavigator（0.1.2+），由本插件定位条接管。 */
  hideOfficialNav?: boolean
  /** 页面空闲时逐步加载更早历史；检测到性能压力时自动暂停。 */
  autoLoad?: boolean
  /** 定位条默认色模式：auto（优先宿主淡色文字色，对比不足自动换纠偏灰）/ custom（用 navColorCustom）；gray…red 为历史色系值（兼容保留）。 */
  navColor?: string
  /** 定位条默认色自定义颜色（navColor = custom 时生效）：任意 CSS 颜色，如 #3b82f6 / rgb(59,130,246) / rgba(59,130,246,0.85)。 */
  navColorCustom?: string
  /** 定位条默认色历史明度档：l1…l5，仅 navColor 为历史色系值时生效（兼容保留）。 */
  navColorLight?: string
  /** 定位条强调色模式：auto（跟随主题品牌色）/ custom（用 navAccentCustom）；gray…red 为历史色系值（兼容保留）。 */
  navAccent?: string
  /** 定位条强调色自定义颜色（navAccent = custom 时生效）：任意 CSS 颜色。 */
  navAccentCustom?: string
  /** 定位条强调色历史明度档：l1…l5，仅 navAccent 为历史色系值时生效（兼容保留）。 */
  navAccentLight?: string
  /** 定位条贴边：left（左缘，默认）/ right（右缘镜像，强调三角与摘要卡随边镜像）。 */
  navSide?: string
  /** 定位条样式：bar（横线，默认）/ dot（圆点，保留鱼眼放大交互）。 */
  navStyle?: string
  /** 定位条外圈：在插件自己的横线/圆点外描一圈强调色（1px 描边、外扩 2px），仅当前轮与悬停轮。 */
  navRing?: boolean
  /** 首次引导是否已看过：false（默认）时，若检测到插件轨与官方 TurnNavigator 并存，会弹一次选择向导；点过任意选项或“知道了”后置为 true。 */
  navGuideSeen?: boolean
}

/** 定位条默认色模式枚举（auto / custom；gray…red 为历史色系值，兼容保留）。 */
export const NAV_HUE_KEYS = ['auto', 'custom', 'gray', 'black', 'white', 'blue', 'violet', 'cyan', 'green', 'orange', 'red'] as const
/** 定位条强调色模式枚举（auto / custom；gray…red 为历史色系值，兼容保留）。 */
export const NAV_ACCENT_KEYS = ['auto', 'custom', 'gray', 'black', 'white', 'blue', 'violet', 'cyan', 'green', 'orange', 'red'] as const
/** 定位条明度档枚举。 */
export const NAV_LIGHT_KEYS = ['l1', 'l2', 'l3', 'l4', 'l5'] as const
/** 定位条贴边枚举。 */
export const NAV_SIDE_KEYS = ['left', 'right'] as const
/** 定位条样式枚举。 */
export const NAV_STYLE_KEYS = ['bar', 'dot'] as const

// DSH 0.2：全部字段标 volatile —— 它们就是设置面板的全部内容，且只有 volatile
// 字段支持免 remount 的即时生效。schema 调用的输出会把 volatile 字段包成 live 引用。
export const Config = z.object({
  fold: z.boolean().default(true).volatile(),
  divider: z.boolean().default(true).volatile(),
  navigator: z.boolean().default(true).volatile(),
  hideOfficialNav: z.boolean().default(false).volatile(),
  autoLoad: z.boolean().default(true).volatile(),
  navColor: z.union(NAV_HUE_KEYS).default('auto').volatile(),
  navColorCustom: z.string().default('').volatile(),
  navColorLight: z.union(NAV_LIGHT_KEYS).default('l3').volatile(),
  navAccent: z.union(NAV_ACCENT_KEYS).default('auto').volatile(),
  navAccentCustom: z.string().default('').volatile(),
  navAccentLight: z.union(NAV_LIGHT_KEYS).default('l3').volatile(),
  navSide: z.union(NAV_SIDE_KEYS).default('left').volatile(),
  navStyle: z.union(NAV_STYLE_KEYS).default('bar').volatile(),
  navRing: z.boolean().default(false).volatile(),
  navGuideSeen: z.boolean().default(false).volatile(),
})

export const inject: string[] = []

export function apply(_ctx: Context, _config?: Config): void {
  // DSH 0.2 设置面为声明式：Config 的 volatile 字段由宿主自动渲染，没有注册调用。
  // 宿主侧不消费配置值。设置变更的即时生效由浏览器半对 configForms 的订阅驱动。
}
