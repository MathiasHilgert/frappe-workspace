import { error, type RequestEvent } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import type { Logger } from 'pino';
import { m } from '#lib/paraglide/messages.js';
import type { Clock } from '../clock';
import { deleteSessionCookie } from '../session/session-cookie';
import {
	failureLogFields,
	sessionUnavailableCode,
	type SessionStore
} from '../session/session-store';
import { isSid } from '../session/sid';

/** What {@link createHandleSession} needs from the outside world. */
export type HandleSessionDeps = {
	readonly store: Pick<SessionStore, 'read'>;
	/** `SESSION_COOKIE_NAME`. */
	readonly cookieName: string;
	readonly clock: Clock;
	readonly log: Pick<Logger, 'error'>;
};

/**
 * The 503 for a page request is a response, so `handleSecurityHeaders` (earlier in the
 * sequence) still decorates it; data and remote requests get Kit's thrown error instead.
 */
function serviceUnavailable(event: RequestEvent): Response {
	const body = { code: sessionUnavailableCode, message: m.error_service_unavailable() };
	if (event.isDataRequest || event.isRemoteRequest) error(503, body.message, { code: body.code });
	return Response.json(body, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Builds `handleSession` (SEC-01..03): reads the session of the sid cookie into
 * `locals.session`. A missing, malformed, unknown or expired cookie means no session (and the
 * cookie is deleted, except when absent); a store that fails or is too slow answers 503 without
 * retrying, treating the user as anonymous or touching the cookie. `/health/*` never reads the
 * store. Responses of routed requests are `private, no-store`.
 */
export function createHandleSession({ store, cookieName, clock, log }: HandleSessionDeps): Handle {
	return async ({ event, resolve }) => {
		const routeId = event.route.id;
		if (routeId?.startsWith('/health/') === true) return resolve(event);

		const sid = event.cookies.get(cookieName);
		if (sid !== undefined) {
			if (isSid(sid)) {
				const read = await store.read(sid);
				if (!read.ok) {
					log.error(failureLogFields(read), 'session store unavailable');
					return serviceUnavailable(event);
				}
				const stored = read.value;
				const live =
					stored !== undefined &&
					Temporal.Instant.compare(Temporal.Instant.from(stored.absoluteExpiresAt), clock.now()) >
						0;
				if (live) event.locals.session = stored;
				else deleteSessionCookie(event.cookies, cookieName);
			} else {
				deleteSessionCookie(event.cookies, cookieName);
			}
		}

		const response = await resolve(event);
		if (routeId !== null) response.headers.set('Cache-Control', 'private, no-store');
		return response;
	};
}
