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
		// ioredis opens TLS only for rediss://; valkey:// and valkeys:// would connect in plain text.
		schema: z.url({ protocol: /^(?:redis|rediss)$/ }),
		description:
			"URL of the BFF's own Valkey, e.g. redis://:password@valkey:6379/0 (rediss:// for TLS). Required."
	},
	VALKEY_COMMAND_TIMEOUT_MS: {
		schema: z.coerce.number<string | undefined>().int().min(50).max(250).default(250),
		description:
			'Longest wait for one Valkey command, in ms (SEC-03). Past it the request gets a 503.'
	}
} as const;
