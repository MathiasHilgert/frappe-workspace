import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseBlocks, readThemes } from './tokens/theme-css';

const css = readFileSync(new URL('../../../routes/layout.css', import.meta.url), 'utf8');
const themes = readThemes(css);
const blocks = parseBlocks(css);
const declarationsOf = (selector: string) =>
	blocks
		.filter((b) => b.selector === selector)
		.reduce<Record<string, string>>((all, b) => ({ ...all, ...b.declarations }), {});

/** The Frappé `tokens.json` colors (light, dark) the console takes, minus `wash-*` and `glass*`. */
const COLORS: Readonly<Record<string, readonly [light: string, dark: string]>> = {
	ground: ['#f5f2f3', '#151013'],
	surface: ['#ffffff', '#201a1d'],
	tint: ['#ece6ee', '#2c2430'],
	line: ['#e3dbe0', '#3a3036'],
	'line-strong': ['#8f7f88', '#857680'],
	ink: ['#1f1418', '#f4eef0'],
	'ink-muted': ['#665860', '#b8aab1'],
	'on-ink': ['#ffffff', '#1f1418'],
	'ink-hover': ['#3a2a31', '#ddd3d8'],
	'wine-hover': ['#561226', '#f7d6df'],
	wine: ['#6b1730', '#f2c4d1'],
	'wine-deep': ['#3d0c1c', '#4a1626'],
	'wine-soft': ['#f4e4e9', '#3a1922'],
	'on-wine': ['#ffffff', '#1f1418'],
	positive: ['#2f5a2c', '#9fd09a'],
	'positive-soft': ['#e3efe1', '#1d2e1c'],
	warning: ['#7f4f00', '#efc06a'],
	'warning-soft': ['#f8ecd4', '#33260c'],
	danger: ['#b42318', '#ff6f5e'],
	'danger-soft': ['#fde8e5', '#3b1512'],
	'series-1': ['#9b2448', '#d0567f'],
	'series-2': ['#0e7fa6', '#2b8fbf'],
	'series-3': ['#c47a0c', '#bd8019'],
	'series-4': ['#7860cc', '#8b72dc'],
	'series-5': ['#4f8a22', '#62952a'],
	'series-6': ['#d0628c', '#c45ea8'],
	'seq-1': ['#f6e4ea', '#3a2129'],
	'seq-2': ['#ecc4d1', '#5c2a3a'],
	'seq-3': ['#dc96ac', '#82354f'],
	'seq-4': ['#c66483', '#a94a69'],
	'seq-5': ['#a3375b', '#cc6d8a'],
	'seq-6': ['#7a1c3c', '#e79bb2'],
	'seq-7': ['#4f0f26', '#f7cbd8'],
	'div-neg': ['#9b2448', '#d0567f'],
	'div-mid': ['#ece8ea', '#3a3236'],
	'div-pos': ['#0e7fa6', '#2b8fbf']
};

/** shadcn variable -> Frappé token it maps onto (S2). */
const SHADCN_MAP: Readonly<Record<string, string>> = {
	background: 'ground',
	foreground: 'ink',
	card: 'surface',
	'card-foreground': 'ink',
	popover: 'surface',
	'popover-foreground': 'ink',
	primary: 'wine',
	'primary-foreground': 'on-wine',
	secondary: 'tint',
	'secondary-foreground': 'ink',
	muted: 'tint',
	'muted-foreground': 'ink-muted',
	accent: 'tint',
	'accent-foreground': 'ink',
	destructive: 'danger',
	border: 'line',
	input: 'line-strong',
	ring: 'focus',
	'chart-1': 'series-1',
	'chart-2': 'series-2',
	'chart-3': 'series-3',
	'chart-4': 'series-4',
	'chart-5': 'series-5',
	sidebar: 'tint',
	'sidebar-foreground': 'ink',
	'sidebar-primary': 'wine',
	'sidebar-primary-foreground': 'on-wine',
	'sidebar-accent': 'surface',
	'sidebar-accent-foreground': 'ink',
	'sidebar-border': 'line',
	'sidebar-ring': 'focus'
};

describe('theme scopes in layout.css', () => {
	it.each([
		['light', 0],
		['dark', 1],
		['darkMedia', 1]
	] as const)('defines every Frappé color with its exact %s value', (scope, index) => {
		const expected = Object.fromEntries(
			Object.entries(COLORS).map(([name, pair]) => [`--${name}`, pair[index]])
		);

		expect(themes[scope]).toMatchObject(expected);
	});

	it('sets focus to wine in every scope', () => {
		expect([themes.light['--focus'], themes.dark['--focus'], themes.darkMedia['--focus']]).toEqual([
			COLORS.wine?.[0],
			COLORS.wine?.[1],
			COLORS.wine?.[1]
		]);
	});

	it('maps every shadcn variable onto its Frappé token in every scope', () => {
		const expectFor = (scope: Readonly<Record<string, string>>) =>
			Object.fromEntries(
				Object.keys(SHADCN_MAP).map((name) => [`--${name}`, scope[`--${SHADCN_MAP[name] ?? name}`]])
			);

		expect(themes.light).toMatchObject(expectFor(themes.light));
		expect(themes.dark).toMatchObject(expectFor(themes.dark));
		expect(themes.darkMedia).toMatchObject(expectFor(themes.darkMedia));
	});

	it('declares the color-scheme and a scrim in each scope', () => {
		expect(
			[themes.light, themes.dark, themes.darkMedia].map((s) => [
				s['color-scheme'],
				s['--scrim'] !== undefined
			])
		).toEqual([
			['light', true],
			['dark', true],
			['dark', true]
		]);
	});

	it('gives the OS-dark scope the same values as the .dark scope', () => {
		expect(themes.darkMedia).toEqual(themes.dark);
	});

	it.each([
		[
			'light',
			'0 1px 2px rgba(61, 12, 28, 0.05), 0 12px 32px -16px rgba(61, 12, 28, 0.16)',
			'0 8px 24px -8px rgba(61, 12, 28, 0.22)',
			'0 24px 64px -24px rgba(61, 12, 28, 0.18)'
		],
		[
			'dark',
			'0 1px 2px rgba(0, 0, 0, 0.4), 0 12px 32px -16px rgba(0, 0, 0, 0.7)',
			'0 8px 24px -8px rgba(0, 0, 0, 0.7)',
			'0 24px 64px -24px rgba(0, 0, 0, 0.6)'
		],
		[
			'darkMedia',
			'0 1px 2px rgba(0, 0, 0, 0.4), 0 12px 32px -16px rgba(0, 0, 0, 0.7)',
			'0 8px 24px -8px rgba(0, 0, 0, 0.7)',
			'0 24px 64px -24px rgba(0, 0, 0, 0.6)'
		]
	] as const)('keeps the %s shadow tokens', (scope, card, pop, frame) => {
		expect(themes[scope]).toMatchObject({
			'--elevation-card': card,
			'--elevation-pop': pop,
			'--elevation-frame': frame
		});
	});
});

describe('type, radii and shadows in layout.css', () => {
	it.each([
		['display-xl', '64px', '64px', '600', '-0.025em'],
		['display-l', '44px', '48px', '600', '-0.02em'],
		['title', '28px', '34px', '600', '-0.01em']
	])('text-%s is %s/%s %s %s in the display family', (name, size, line, weight, tracking) => {
		expect(declarationsOf(`@utility text-${name}`)).toMatchObject({
			'font-family': 'var(--font-display)',
			'font-size': size,
			'line-height': line,
			'font-weight': weight,
			'letter-spacing': tracking
		});
	});

	it.each([
		['heading', '20px', '28px', '600'],
		['body-lg', '18px', '28px', '400'],
		['body', '16px', '24px', '400'],
		['label', '14px', '20px', '500'],
		['caption', '13px', '18px', '400'],
		['amount', '16px', '24px', '600']
	])('text-%s is %s/%s %s in the sans family', (name, size, line, weight) => {
		expect(declarationsOf(`@utility text-${name}`)).toMatchObject({
			'font-family': 'var(--font-sans)',
			'font-size': size,
			'line-height': line,
			'font-weight': weight
		});
	});

	it('sets tabular numbers on text-amount', () => {
		expect(declarationsOf('@utility text-amount')).toMatchObject({
			'font-variant-numeric': 'tabular-nums'
		});
	});

	it('names the role radii and leaves the Tailwind scale derived from --radius', () => {
		expect(declarationsOf('@theme inline')).toMatchObject({
			'--radius-field': '10px',
			'--radius-card': '18px',
			'--radius-frame': '32px',
			'--radius-pill': '999px',
			'--radius-4xl': 'calc(var(--radius) * 2.6)',
			'--shadow-card': 'var(--elevation-card)',
			'--shadow-pop': 'var(--elevation-pop)',
			'--shadow-frame': 'var(--elevation-frame)'
		});
	});

	it.each([
		['sm', 'calc(var(--radius) * 0.6)'],
		['md', 'calc(var(--radius) * 0.8)'],
		['lg', 'var(--radius)'],
		['xl', 'calc(var(--radius) * 1.4)'],
		['2xl', 'calc(var(--radius) * 1.8)'],
		['3xl', 'calc(var(--radius) * 2.2)']
	])('derives --radius-%s from --radius', (name, value) => {
		expect(declarationsOf('@theme inline')[`--radius-${name}`]).toBe(value);
	});

	it('applies text-body to the body', () => {
		expect(css).toMatch(/body\s*\{[^}]*@apply[^;}]*\stext-body(?![-\w])/);
	});

	it('no longer mentions figtree in layout.css or package.json', () => {
		const pkg = readFileSync(new URL('../../../../package.json', import.meta.url), 'utf8');

		expect([/figtree/i.test(css), /figtree/i.test(pkg)]).toEqual([false, false]);
	});

	it('serves the display and sans families from the self-hosted fonts', () => {
		const theme = declarationsOf('@theme inline');

		expect([theme['--font-sans'], theme['--font-display']]).toEqual([
			expect.stringContaining('Hanken Grotesk Variable'),
			expect.stringContaining('Bricolage Grotesque Variable')
		]);
	});
});
