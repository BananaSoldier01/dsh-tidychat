/**
 * dsh-tidychat host 半：注册 settings 命名空间与配置 schema，让「设置 > 插件配置」
 * 面板能可视化开关四个功能。实际功能全部在浏览器半（exports "./client"）。
 *
 * 本插件宿主侧不消费配置值（仅注册命名空间以暴露给配置面板）；
 * 浏览器半通过 settingsScope 读取同一命名空间并即时生效。
 */

import type { Context } from '@deepseek-ai/cordis'
import z from 'schemastery'

/** 设置命名空间（v0.1.3-alpha.1 起 settings 用小写连字符字符串命名空间注册，不再经 settingsNamespace()）。 */
export const TIDYCHAT_SETTINGS_NAMESPACE = 'tidychat' as const

/** 插件配置。 */
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

export const Config: z<Config> = z.object({
  fold: z.boolean().default(true),
  divider: z.boolean().default(true),
  navigator: z.boolean().default(false),
  hideOfficialNav: z.boolean().default(false),
  autoLoad: z.boolean().default(false),
  navColor: z.union(NAV_HUE_KEYS).default('auto'),
  navColorCustom: z.string().default(''),
  navColorLight: z.union(NAV_LIGHT_KEYS).default('l3'),
  navAccent: z.union(NAV_ACCENT_KEYS).default('auto'),
  navAccentCustom: z.string().default(''),
  navAccentLight: z.union(NAV_LIGHT_KEYS).default('l3'),
  navSide: z.union(NAV_SIDE_KEYS).default('left'),
  navStyle: z.union(NAV_STYLE_KEYS).default('bar'),
  navRing: z.boolean().default(false),
})

export const inject: string[] = []

export function apply(ctx: Context, config?: Config): void {
  // 注册 settings 命名空间；宿主侧不消费，setSource/onChange 留空。
  // settings API 在不同 DSH 版本不同（0.1.2+ 移除了 installSettingsSection/settingsNamespace）：
  //   - 0.1.2-rc.1+: ctx.settings.installSection(owner, ns, schema, entry, hooks)
  //   - 0.1.0-rc.7 / 0.1.1-rc.x: ctx.settings.register(ns, schema, { base })（register 在所有目标版本都存在）
  // 两者都兼容：优先 installSection（保持 0.1.2 行为不变），否则回退 register。极端旧版本无 register 时静默跳过，保证插件至少能加载。
  ctx.inject(['settings'], (settingsCtx) => {
    const settings = (settingsCtx as any).settings
    if (typeof settings?.installSection === 'function') {
      settings.installSection(ctx, TIDYCHAT_SETTINGS_NAMESPACE, Config, config ?? {}, {
        setSource: () => {},
        onChange: () => {},
      })
    } else if (typeof settings?.register === 'function') {
      settings.register(TIDYCHAT_SETTINGS_NAMESPACE, Config, { base: config ?? {} })
    }
  })
}
