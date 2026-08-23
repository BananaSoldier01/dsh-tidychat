import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
import z from "schemastery";
//#region src/index.ts
/**
* dsh-tidychat host 半：注册 settings 命名空间与配置 schema，让「设置 > 插件配置」
* 面板能可视化开关四个功能。实际功能全部在浏览器半（exports "./client"）。
*
* 本插件宿主侧不消费配置值（仅注册命名空间以暴露给配置面板）；
* 浏览器半通过 settingsScope 读取同一命名空间并即时生效。
*/
/** 设置命名空间（需在 dsh-host-apiproxy 的 WEB_SETTINGS_NAMESPACES 白名单内）。 */
const TIDYCHAT_SETTINGS_NAMESPACE = settingsNamespace("tidychat");
/** 定位条默认色色系枚举。 */
const NAV_HUE_KEYS = [
	"auto",
	"gray",
	"black",
	"white",
	"blue",
	"violet",
	"cyan",
	"green",
	"orange",
	"red"
];
/** 定位条强调色色系枚举。 */
const NAV_ACCENT_KEYS = [
	"auto",
	"gray",
	"black",
	"white",
	"blue",
	"violet",
	"cyan",
	"green",
	"orange",
	"red"
];
/** 定位条明度档枚举。 */
const NAV_LIGHT_KEYS = [
	"l1",
	"l2",
	"l3",
	"l4",
	"l5"
];
const Config = z.object({
	fold: z.boolean().default(true),
	divider: z.boolean().default(true),
	navigator: z.boolean().default(true),
	autoLoad: z.boolean().default(true),
	navColor: z.union(NAV_HUE_KEYS).default("auto"),
	navColorLight: z.union(NAV_LIGHT_KEYS).default("l3"),
	navAccent: z.union(NAV_ACCENT_KEYS).default("auto"),
	navAccentLight: z.union(NAV_LIGHT_KEYS).default("l3")
});
const inject = [];
function apply(ctx, config) {
	installSettingsSection(ctx, TIDYCHAT_SETTINGS_NAMESPACE, Config, config ?? {}, {
		setSource: () => {},
		onChange: () => {}
	});
}
//#endregion
export { Config, NAV_ACCENT_KEYS, NAV_HUE_KEYS, NAV_LIGHT_KEYS, TIDYCHAT_SETTINGS_NAMESPACE, apply, inject };
