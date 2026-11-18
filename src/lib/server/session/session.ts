import { z } from 'zod';

/** An ISO instant that `Temporal.Instant.from` also accepts, so a parsed session never crashes a later read of its expiry. */
const instant = z.iso.datetime({ offset: true }).refine((value) => {
	try {
		Temporal.Instant.from(value);
		return true;
	} catch {
		return false;
	}
}, 'not a valid instant');

/**
 * What the BFF keeps per sid: the frappe-api `OpenedSessionResponse` fields (SEC-02). The token
 * never leaves the server (SEC-01). Validated on every read from Valkey.
 */
export const sessionSchema = z
	.object({
		sessionId: z.uuid(),
		token: z.string().min(1),
		absoluteExpiresAt: instant,
		idleExpiresAt: instant
	})
	.readonly();

/** A signed-in session as stored in Valkey and exposed on `locals.session`. */
export type Session = z.infer<typeof sessionSchema>;
