import {
	checkFrappeApiBudget,
	type FrappeApiBudget
} from '#lib/server/config/frappe-api-budget.js';

/**
 * Stops the start when variables that are valid one by one disagree with each other (OPS-02).
 * `defineEnvVars` has already rejected every invalid single variable by then. Throwing is right
 * here: a misconfigured process must not serve requests.
 */
export function verifyStartupConfig(budget: FrappeApiBudget): void {
	const checked = checkFrappeApiBudget(budget);
	if (checked.ok) return;

	const reasons = checked.errors.map((error) => error.message ?? error.code).join('\n');
	throw new Error(`Invalid configuration:\n${reasons}`);
}
