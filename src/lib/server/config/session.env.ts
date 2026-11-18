import { z } from 'zod';

/**
 * Session variables (OPS-01, SEC-01, SEC-02). Imported by `src/env.ts`, so it may import only
 * `zod`. `VALKEY_URL` may carry a password, so it has no default.
 */
export const sessionVariables = {
	SESSION_COOKIE_NAME: {
		schema: z
			.string()
			.regex(/^__Host-[\w-]+$/, 'Must start with __Host- (SEC-01).')
			.default('__Host-workspace-sid'),
		description: 'Name of the session cookie. Must keep the __Host- prefix.'
	},
	VALKEY_URL: {
		schema: z.url({ protocol: /^(?:redis|rediss|valkey|valkeys)$/ }),
		description: "URL of the BFF's own Valkey, e.g. redis://:password@valkey:6379/0. Required."
	}
} as const;
