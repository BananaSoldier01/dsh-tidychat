import z from "schemastery";
//#region src/index.ts
/** 设置命名空间（v0.1.3-alpha.1 起 settings 用小写连字符字符串命名空间注册，不再经 settingsNamespace()）。 */
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
const Config = z.object({
	fold: z.boolean().default(true),
	divider: z.boolean().default(true),
	navigator: z.boolean().default(false),
	autoLoad: z.boolean().default(false),
	navColor: z.union(NAV_HUE_KEYS).default("auto"),
	navColorCustom: z.string().default(""),
	navColorLight: z.union(NAV_LIGHT_KEYS).default("l3"),
	navAccent: z.union(NAV_ACCENT_KEYS).default("auto"),
	navAccentCustom: z.string().default(""),
	navAccentLight: z.union(NAV_LIGHT_KEYS).default("l3")
});
const inject = [];
function apply(ctx, config) {
	ctx.inject(["settings"], (settingsCtx) => {
		const settings = settingsCtx.settings;
		if (typeof settings?.installSection === "function") settings.installSection(ctx, TIDYCHAT_SETTINGS_NAMESPACE, Config, config ?? {}, {
			setSource: () => {},
			onChange: () => {}
		});
		else if (typeof settings?.register === "function") settings.register(TIDYCHAT_SETTINGS_NAMESPACE, Config, { base: config ?? {} });
	});
}
//#endregion
export { Config, NAV_ACCENT_KEYS, NAV_HUE_KEYS, NAV_LIGHT_KEYS, TIDYCHAT_SETTINGS_NAMESPACE, apply, inject };
