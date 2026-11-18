import { describe, expect, it } from 'vitest';
import { appErrorKinds, assertNever } from './app-error';

describe('appErrorKinds', () => {
	it('lists the nine kinds frappe-api uses', () => {
		expect(appErrorKinds).toStrictEqual([
			'invalidValue',
			'ruleViolation',
			'notFound',
			'unavailable',
			'unauthenticated',
			'forbidden',
			'rateLimited',
			'preconditionFailed',
			'conflict'
		]);
	});
});

describe('assertNever', () => {
	it('throws when a value outside the union arrives at runtime', () => {
		const unexpected: unknown = 'teapot';

		// @ts-expect-error -- simulates a value the type system ruled out.
		const act = () => assertNever(unexpected);

		expect(act).toThrow('Unexpected value: teapot');
	});
});
