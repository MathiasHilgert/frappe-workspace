import { describe, expect, it } from 'vitest';
import type { AppError } from './app-error';
import { fail, ok } from './result';

const tooLong: AppError = {
	kind: 'invalidValue',
	code: 'workspace.name.too_long',
	params: { max: 64 }
};
const taken: AppError = { kind: 'conflict', code: 'workspace.name.taken' };

describe('ok', () => {
	it('carries the given value', () => {
		const result = ok({ name: 'Acme' });

		expect(result).toStrictEqual({ ok: true, value: { name: 'Acme' } });
	});

	it('carries no value when called without one', () => {
		const result = ok();

		expect(result).toStrictEqual({ ok: true, value: undefined });
	});
});

describe('fail', () => {
	it('reports every given error together, in order', () => {
		const result = fail(tooLong, taken);

		expect(result).toStrictEqual({ ok: false, errors: [tooLong, taken] });
	});
});
