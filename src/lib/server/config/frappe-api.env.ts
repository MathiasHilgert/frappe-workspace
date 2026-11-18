import { z } from 'zod';

/**
 * frappe-api client variables (OPS-01, OPS-02). Imported by `src/env.ts`, so it may import only
 * `zod`: Kit loads `src/env.ts` in a bare Vite server where `$app/*` is refused.
 */
export const frappeApiVariables = {
	FRAPPE_API_BASE_URL: {
		schema: z.url({ protocol: /^https?$/ }),
		description: 'frappe-api base URL, e.g. https://api.example.com. Required.'
	},
	FRAPPE_API_ATTEMPT_TIMEOUT_MS: {
		schema: z.coerce.number<string | undefined>().int().min(100).max(30_000).default(3_000),
		description: 'Timeout of one frappe-api attempt, in ms.'
	},
	FRAPPE_API_TOTAL_TIMEOUT_MS: {
		schema: z.coerce.number<string | undefined>().int().min(100).max(60_000).default(8_000),
		description:
			'Budget of one frappe-api call including its retry, in ms. Must fit two attempts plus the longest backoff.'
	}
} as const;
