import { describe, expect, it } from 'vitest';
import { checkFrappeApiBudget } from './frappe-api-budget';

describe('checkFrappeApiBudget', () => {
	it('accepts a total that fits two attempts plus the longest backoff', () => {
		const result = checkFrappeApiBudget({ attemptMs: 3_000, totalMs: 7_000 });

		expect(result).toStrictEqual({ ok: true, value: undefined });
	});

	it('rejects a total that would cancel the retry halfway, naming both variables', () => {
		const result = checkFrappeApiBudget({ attemptMs: 3_000, totalMs: 6_999 });

		expect(result).toMatchObject({
			ok: false,
			errors: [
				{
					kind: 'invalidValue',
					code: 'workspace.config.frappe_api_budget_too_short',
					params: { attemptMs: 3_000, totalMs: 6_999, required: 7_000 }
				}
			]
		});
		expect(result.ok ? '' : result.errors[0]?.message).toMatch(
			/FRAPPE_API_TOTAL_TIMEOUT_MS \(6999\).*7000.*FRAPPE_API_ATTEMPT_TIMEOUT_MS \(3000\)/
		);
	});
});
