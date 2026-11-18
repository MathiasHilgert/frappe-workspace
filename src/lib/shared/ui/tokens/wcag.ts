/** An sRGB color with channels 0-255 and alpha 0-1. */
export type Rgba = {
	readonly r: number;
	readonly g: number;
	readonly b: number;
	readonly a: number;
};

const HEX = /^#(?<hex>[\da-f]{3,8})$/i;
const RGB = /^rgba?\((?<args>[^)]+)\)$/i;

function parseHex(hex: string, source: string): Rgba {
	const full = hex.length <= 4 ? hex.replaceAll(/./g, '$&$&') : hex;
	if (full.length !== 6 && full.length !== 8) throw new Error(`Unsupported color: ${source}`);
	const channel = (i: number) => Number.parseInt(full.slice(i, i + 2), 16);
	return {
		r: channel(0),
		g: channel(2),
		b: channel(4),
		a: full.length === 8 ? channel(6) / 255 : 1
	};
}

function parseFunctional(args: string, source: string): Rgba {
	const parts = args
		.split(/[\s,/]+/)
		.filter(Boolean)
		.map(Number);
	const [r, g, b, a = 1] = parts;
	if (r === undefined || g === undefined || b === undefined || parts.some(Number.isNaN)) {
		throw new Error(`Unsupported color: ${source}`);
	}
	return { r, g, b, a };
}

/** Parses `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb(r g b / a)` and `rgba(r, g, b, a)`; throws on anything else. */
export function parseColor(value: string): Rgba {
	const text = value.trim();
	const hex = HEX.exec(text)?.groups?.hex;
	if (hex !== undefined) return parseHex(hex, value);
	const args = RGB.exec(text)?.groups?.args;
	if (args !== undefined) return parseFunctional(args, value);
	throw new Error(`Unsupported color: ${value}`);
}

/** Composites `top` over an opaque `base`, as the browser paints it. */
export function composite(top: Rgba, base: Rgba): Rgba {
	const mix = (t: number, b: number) => t * top.a + b * (1 - top.a);
	return { r: mix(top.r, base.r), g: mix(top.g, base.g), b: mix(top.b, base.b), a: 1 };
}

function luminance({ r, g, b }: Rgba): number {
	const linear = (c: number) => {
		const s = c / 255;
		return s <= 0.039_28 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG 2 contrast ratio of `fg` on `bg`; a translucent `fg` is composited over `bg` first, and `bg` must be opaque. */
export function contrastRatio(fg: Rgba, bg: Rgba): number {
	const painted = composite(fg, bg);
	const [hi, lo] = [luminance(painted), luminance(bg)].sort((x, y) => y - x);
	return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}
