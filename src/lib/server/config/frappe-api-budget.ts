import type { AppError } from '#lib/shared/kernel/app-error.js';
import { fail, ok, type Result } from '#lib/shared/kernel/result.js';

/** At most one retry (OPS-02), so a call makes at most two attempts. */
export const FRAPPE_API_MAX_ATTEMPTS = 2;

/** Ceiling of the wait before the retry, `Retry-After` and jitter included (OPS-02). */
export const FRAPPE_API_MAX_BACKOFF_MS = 1_000;

/** The configured frappe-api timeouts, in ms. */
export type FrappeApiBudget = { readonly attemptMs: number; readonly totalMs: number };

/**
 * Checks that the total budget fits every attempt plus the longest backoff (OPS-02), so a
 * legitimate retry is never cancelled halfway.
 */
export function checkFrappeApiBudget({ attemptMs, totalMs }: FrappeApiBudget): Result<undefined> {
	const required = attemptMs * FRAPPE_API_MAX_ATTEMPTS + FRAPPE_API_MAX_BACKOFF_MS;
	if (totalMs >= required) return ok();

	const budgetTooShort: AppError = {
		kind: 'invalidValue',
		code: 'workspace.config.frappe_api_budget_too_short',
		message: `FRAPPE_API_TOTAL_TIMEOUT_MS (${String(totalMs)}) must be at least ${String(required)}: ${String(FRAPPE_API_MAX_ATTEMPTS)} × FRAPPE_API_ATTEMPT_TIMEOUT_MS (${String(attemptMs)}) + ${String(FRAPPE_API_MAX_BACKOFF_MS)} ms backoff.`,
		params: { attemptMs, totalMs, required }
	};
	return fail(budgetTooShort);
}
