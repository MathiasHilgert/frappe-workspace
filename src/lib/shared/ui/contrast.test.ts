import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { composite, contrastRatio, parseColor, type Rgba } from './tokens/wcag';
import { readThemes, type ThemeName } from './tokens/theme-css';

const themes = readThemes(
	readFileSync(new URL('../../../routes/layout.css', import.meta.url), 'utf8')
);
const SCOPES: readonly ThemeName[] = ['light', 'dark', 'darkMedia'];

function color(scope: ThemeName, token: string): Rgba {
	const value = themes[scope][`--${token}`];
	if (value === undefined) throw new Error(`--${token} is not defined in ${scope}`);
	return parseColor(value);
}

/** Measured as rendered: a translucent foreground is composited over the background it sits on. */
function ratio(scope: ThemeName, fg: string, bg: string): number {
	return contrastRatio(color(scope, fg), color(scope, bg));
}

const TEXT_FLOOR = 4.5;
const NON_TEXT_FLOOR = 3;

const TEXT_PAIRS: readonly (readonly [fg: string, bg: string])[] = [
	['ink', 'ground'],
	['ink', 'surface'],
	['ink', 'tint'],
	['ink-muted', 'ground'],
	['ink-muted', 'surface'],
	['ink-muted', 'tint'],
	['on-wine', 'wine'],
	['on-wine', 'wine-hover'],
	['on-ink', 'ink'],
	['on-ink', 'ink-hover'],
	['wine', 'surface'],
	['wine', 'wine-soft'],
	['positive', 'surface'],
	['positive', 'positive-soft'],
	['warning', 'surface'],
	['warning', 'warning-soft'],
	['danger', 'surface'],
	['danger', 'danger-soft']
];

const NON_TEXT_PAIRS: readonly (readonly [fg: string, bg: string])[] = [
	['line-strong', 'surface'],
	['line-strong', 'tint'],
	['focus', 'ground'],
	['focus', 'surface'],
	['focus', 'tint']
];

describe('contrast of the theme tokens in layout.css', () => {
	it.each(SCOPES.flatMap((scope) => TEXT_PAIRS.map(([fg, bg]) => [scope, fg, bg] as const)))(
		'%s: %s on %s is at least 4.5:1',
		(scope, fg, bg) => {
			expect(ratio(scope, fg, bg)).toBeGreaterThanOrEqual(TEXT_FLOOR);
		}
	);

	it.each(SCOPES.flatMap((scope) => NON_TEXT_PAIRS.map(([fg, bg]) => [scope, fg, bg] as const)))(
		'%s: %s on %s is at least 3:1',
		(scope, fg, bg) => {
			expect(ratio(scope, fg, bg)).toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
		}
	);

	it.each(SCOPES)(
		'%s: the highlighted-item indicator (line-strong or focus) is at least 3:1 on surface',
		(scope) => {
			expect(
				Math.min(ratio(scope, 'line-strong', 'surface'), ratio(scope, 'focus', 'surface'))
			).toBeGreaterThanOrEqual(NON_TEXT_FLOOR);
		}
	);

	it.each(SCOPES)(
		'%s: overlay text keeps 4.5:1 over the scrim composited on the ground',
		(scope) => {
			const scrimmed = composite(color(scope, 'scrim'), color(scope, 'ground'));
			const text = scope === 'light' ? color(scope, 'on-ink') : color(scope, 'ink');

			expect(contrastRatio(text, scrimmed)).toBeGreaterThanOrEqual(TEXT_FLOOR);
		}
	);

	it('documents on-wine on wine-deep (dark) as the known failing pair, under 4.5:1', () => {
		expect(ratio('dark', 'on-wine', 'wine-deep')).toBeLessThan(TEXT_FLOOR);
	});
});
