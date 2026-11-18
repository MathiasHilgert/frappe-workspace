import { describe, expect, it } from 'vitest';
import { composite, contrastRatio, parseColor } from './wcag';

describe('wcag helpers', () => {
	it('computes the WCAG ratio of black on white as 21', () => {
		expect(contrastRatio(parseColor('#000'), parseColor('#ffffff'))).toBeCloseTo(21, 5);
	});

	it('composites a translucent color over its background', () => {
		expect(composite(parseColor('rgb(0 0 0 / 0.5)'), parseColor('#ffffff'))).toMatchObject({
			r: 127.5,
			g: 127.5,
			b: 127.5,
			a: 1
		});
	});
});
