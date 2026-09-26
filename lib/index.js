import z from "@deepseek-ai/schemastery";
//#region src/index.ts
/** 设置命名空间（浏览器半按该命名空间读取设置值；0.1.7 上即 profile entry 的 local id）。 */
const TIDYCHAT_SETTINGS_NAMESPACE = "tidychat";
/** 定位条默认色模式枚举（auto / custom；gray…red 为历史色系值，兼容保留）。 */
const NAV_HUE_KEYS = [
	"auto",
	"custom",
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
/** 定位条强调色模式枚举（auto / custom；gray…red 为历史色系值，兼容保留）。 */
const NAV_ACCENT_KEYS = [
	"auto",
	"custom",
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
/** 定位条贴边枚举。 */
const NAV_SIDE_KEYS = ["left", "right"];
/** 定位条样式枚举。 */
const NAV_STYLE_KEYS = ["bar", "dot"];
const Config = z.object({
	fold: z.boolean().default(true).volatile(),
	divider: z.boolean().default(true).volatile(),
	navigator: z.boolean().default(true).volatile(),
	hideOfficialNav: z.boolean().default(false).volatile(),
	autoLoad: z.boolean().default(true).volatile(),
	navColor: z.union(NAV_HUE_KEYS).default("auto").volatile(),
	navColorCustom: z.string().default("").volatile(),
	navColorLight: z.union(NAV_LIGHT_KEYS).default("l3").volatile(),
	navAccent: z.union(NAV_ACCENT_KEYS).default("auto").volatile(),
	navAccentCustom: z.string().default("").volatile(),
	navAccentLight: z.union(NAV_LIGHT_KEYS).default("l3").volatile(),
	navSide: z.union(NAV_SIDE_KEYS).default("left").volatile(),
	navStyle: z.union(NAV_STYLE_KEYS).default("bar").volatile(),
	navRing: z.boolean().default(false).volatile(),
	navGuideSeen: z.boolean().default(false).volatile()
});
const inject = [];
function apply(_ctx, _config) {}
//#endregion
export { Config, NAV_ACCENT_KEYS, NAV_HUE_KEYS, NAV_LIGHT_KEYS, NAV_SIDE_KEYS, NAV_STYLE_KEYS, TIDYCHAT_SETTINGS_NAMESPACE, apply, inject };
