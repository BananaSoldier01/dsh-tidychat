import z from "schemastery";
//#region src/index.ts
/** 设置命名空间（v0.1.3-alpha.1 起 settings 用小写连字符字符串命名空间注册，不再经 settingsNamespace()）。 */
const TIDYCHAT_SETTINGS_NAMESPACE = "tidychat";
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
	navigator: z.boolean().default(false),
	autoLoad: z.boolean().default(false),
	navColor: z.union(NAV_HUE_KEYS).default("auto"),
	navColorLight: z.union(NAV_LIGHT_KEYS).default("l3"),
	navAccent: z.union(NAV_ACCENT_KEYS).default("auto"),
	navAccentLight: z.union(NAV_LIGHT_KEYS).default("l3")
});
const inject = [];
function apply(ctx, config) {
	ctx.inject(["settings"], (settingsCtx) => {
		settingsCtx.settings.installSection(ctx, TIDYCHAT_SETTINGS_NAMESPACE, Config, config ?? {}, {
			setSource: () => {},
			onChange: () => {}
		});
	});
}
//#endregion
export { Config, NAV_ACCENT_KEYS, NAV_HUE_KEYS, NAV_LIGHT_KEYS, TIDYCHAT_SETTINGS_NAMESPACE, apply, inject };
