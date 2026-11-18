import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn with the Frappé classes', () => {
	it.each(['', 'md:', 'data-[state=open]:'])(
		'keeps a text style and a text color together (%s)',
		(prefix) => {
			expect(cn(`${prefix}text-label`, `${prefix}text-on-wine`)).toBe(
				`${prefix}text-label ${prefix}text-on-wine`
			);
		}
	);

	it.each(['', 'md:', 'data-[state=open]:'])(
		'lets a text style replace a Tailwind font size (%s)',
		(prefix) => {
			expect(cn(`${prefix}text-sm`, `${prefix}text-body`)).toBe(`${prefix}text-body`);
		}
	);

	it.each([
		'display-xl',
		'display-l',
		'title',
		'heading',
		'body-lg',
		'body',
		'label',
		'caption',
		'amount'
	])('treats text-%s as a font size', (style) => {
		expect(cn('text-lg', `text-${style}`)).toBe(`text-${style}`);
	});

	it.each(['', 'md:', 'data-[state=open]:'])(
		'lets a role radius replace a Tailwind radius (%s)',
		(prefix) => {
			expect(cn(`${prefix}rounded-4xl`, `${prefix}rounded-pill`)).toBe(`${prefix}rounded-pill`);
		}
	);

	it.each(['field', 'card', 'frame', 'pill'])('treats rounded-%s as a radius', (role) => {
		expect(cn('rounded-md', `rounded-${role}`)).toBe(`rounded-${role}`);
	});

	it.each(['', 'md:', 'data-[state=open]:'])(
		'lets a role shadow replace a Tailwind shadow (%s)',
		(prefix) => {
			expect(cn(`${prefix}shadow-md`, `${prefix}shadow-pop`)).toBe(`${prefix}shadow-pop`);
		}
	);

	it.each(['card', 'pop', 'frame'])('treats shadow-%s as a shadow', (role) => {
		expect(cn('shadow-sm', `shadow-${role}`)).toBe(`shadow-${role}`);
	});

	it('still merges plain Tailwind conflicts and conditionals as before', () => {
		expect(cn('px-2 py-1', undefined, { 'px-4': true })).toBe('py-1 px-4');
	});
});
