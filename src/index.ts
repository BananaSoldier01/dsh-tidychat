/**
 * dsh-tidychat host 半：注册 settings 命名空间与配置 schema，让「设置 > 插件配置」
 * 面板能可视化开关四个功能。实际功能全部在浏览器半（exports "./client"）。
 *
 * 本插件宿主侧不消费配置值（仅注册命名空间以暴露给配置面板）；
 * 浏览器半通过 settingsScope 读取同一命名空间并即时生效。
 */

import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import z from 'schemastery'

/** 设置命名空间（需在 dsh-host-apiproxy 的 WEB_SETTINGS_NAMESPACES 白名单内）。 */
export const TIDYCHAT_SETTINGS_NAMESPACE = settingsNamespace('tidychat')

/** 插件配置。 */
export interface Config {
  /** 已完成轮次自动折叠（思考/工具调用/中间文字，只留最终结论）。 */
  fold?: boolean
  /** 思考行与文字之间的分隔线。 */
  divider?: boolean
  /** 左缘 Codex 式用户消息定位条。 */
  navigator?: boolean
  /** 页面空闲时逐步加载更早历史；检测到性能压力时自动暂停。 */
  autoLoad?: boolean
  /** 定位条默认色色系：auto（优先宿主淡色文字色，对比不足自动换纠偏灰）/ gray / black / white / blue / violet / cyan / green / orange / red。 */
  navColor?: string
  /** 定位条默认色明度档：l1（极浅）/ l2（浅）/ l3（中）/ l4（深）/ l5（极深），仅 navColor ≠ auto 时生效。 */
  navColorLight?: string
  /** 定位条强调色色系：auto（跟随主题品牌色）/ gray / black / white / blue / violet / cyan / green / orange / red。 */
  navAccent?: string
  /** 定位条强调色明度档：l1（极浅）/ l2（浅）/ l3（中）/ l4（深）/ l5（极深），仅 navAccent ≠ auto 时生效。 */
  navAccentLight?: string
  /** 定位条贴边：left（左缘，默认）/ right（右缘镜像，强调三角与摘要卡随边镜像）。 */
  navSide?: string
  /** 定位条样式：bar（竖条，默认）/ dot（圆点，保留鱼眼放大交互）。 */
  navStyle?: string
}

/** 定位条默认色色系枚举。 */
export const NAV_HUE_KEYS = ['auto', 'gray', 'black', 'white', 'blue', 'violet', 'cyan', 'green', 'orange', 'red'] as const
/** 定位条强调色色系枚举。 */
export const NAV_ACCENT_KEYS = ['auto', 'gray', 'black', 'white', 'blue', 'violet', 'cyan', 'green', 'orange', 'red'] as const
/** 定位条明度档枚举。 */
export const NAV_LIGHT_KEYS = ['l1', 'l2', 'l3', 'l4', 'l5'] as const
/** 定位条贴边枚举。 */
export const NAV_SIDE_KEYS = ['left', 'right'] as const
/** 定位条样式枚举。 */
export const NAV_STYLE_KEYS = ['bar', 'dot'] as const

export const Config: z<Config> = z.object({
  fold: z.boolean().default(true),
  divider: z.boolean().default(true),
  navigator: z.boolean().default(true),
  autoLoad: z.boolean().default(true),
  navColor: z.union(NAV_HUE_KEYS).default('auto'),
  navColorLight: z.union(NAV_LIGHT_KEYS).default('l3'),
  navAccent: z.union(NAV_ACCENT_KEYS).default('auto'),
  navAccentLight: z.union(NAV_LIGHT_KEYS).default('l3'),
  navSide: z.union(NAV_SIDE_KEYS).default('left'),
  navStyle: z.union(NAV_STYLE_KEYS).default('bar'),
})

export const inject: string[] = []

export function apply(ctx: any, config?: Config): void {
  // 注册 settings 命名空间；宿主侧不消费，setSource/onChange 留空。
  installSettingsSection(ctx, TIDYCHAT_SETTINGS_NAMESPACE, Config, config ?? {}, {
    setSource: () => {},
    onChange: () => {},
  })
}
