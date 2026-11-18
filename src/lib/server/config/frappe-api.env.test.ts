import { describe, expect, it } from 'vitest';
import { frappeApiVariables } from './frappe-api.env';

const { FRAPPE_API_BASE_URL, FRAPPE_API_ATTEMPT_TIMEOUT_MS, FRAPPE_API_TOTAL_TIMEOUT_MS } =
	frappeApiVariables;

describe('FRAPPE_API_BASE_URL', () => {
	it('is required, with no default', () => {
		expect(FRAPPE_API_BASE_URL.schema.safeParse(undefined).success).toBe(false);
	});
});

describe('frappe-api timeouts', () => {
	it('default to the production budget when unset', () => {
		expect({
			attempt: FRAPPE_API_ATTEMPT_TIMEOUT_MS.schema.parse(undefined),
			total: FRAPPE_API_TOTAL_TIMEOUT_MS.schema.parse(undefined)
		}).toStrictEqual({ attempt: 3_000, total: 8_000 });
	});

	it('read a set value as a number', () => {
		expect(FRAPPE_API_ATTEMPT_TIMEOUT_MS.schema.parse('2500')).toBe(2_500);
	});

	it('reject a value that is not a whole number of ms', () => {
		expect(FRAPPE_API_ATTEMPT_TIMEOUT_MS.schema.safeParse('2.5s').success).toBe(false);
	});
});
