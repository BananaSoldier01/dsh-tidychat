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
  /** 调试输出：控制台每 10s 打印性能报告（turns / scanMs / navItems / autoload）。 */
  debug?: boolean
}

export const Config: z<Config> = z.object({
  fold: z.boolean().default(true),
  divider: z.boolean().default(true),
  navigator: z.boolean().default(true),
  autoLoad: z.boolean().default(true),
  debug: z.boolean().default(false),
})

export const inject: string[] = []

export function apply(ctx: any, config?: Config): void {
  // 注册 settings 命名空间；宿主侧不消费，setSource/onChange 留空。
  installSettingsSection(ctx, TIDYCHAT_SETTINGS_NAMESPACE, Config, config ?? {}, {
    setSource: () => {},
    onChange: () => {},
  })
}
