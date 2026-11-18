import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { isHealthRoute } from '../health/health-route';
import { serializeSessionCookieDeletion } from '../session/session-cookie';
import { signInLocation } from '../session/sign-in-redirect';

/** What {@link createHandleAuthGuard} needs from the outside world. */
export type HandleAuthGuardDeps = {
	/** `SESSION_COOKIE_NAME`. */
	readonly cookieName: string;
};

const publicGroup = '/(public)';

/** Whether a page route may be served to an anonymous visitor. Decided by `route.id` alone. */
function isOpen(routeId: string): boolean {
	return routeId === publicGroup || routeId.startsWith(`${publicGroup}/`) || isHealthRoute(routeId);
}

/**
 * Builds `handleAuthGuard` (S8, S9): denies by default. A page route needs `locals.session` unless it
 * sits under `routes/(public)/` or is a health probe. The decision reads `route.id` only, never
 * `url.pathname` or the client's `x-sveltekit-pathname`; remote requests pass untouched (RMT-02
 * is their authority) and a null route passes to Kit's 404.
 *
 * An anonymous page request gets a 303 as a response, so `handleSecurityHeaders` (earlier in the
 * sequence) still decorates it; a data request gets Kit's thrown `redirect`.
 */
export function createHandleAuthGuard({ cookieName }: HandleAuthGuardDeps): Handle {
	return async ({ event, resolve }) => {
		const routeId = event.route.id;
		if (
			event.isRemoteRequest ||
			routeId === null ||
			isOpen(routeId) ||
			event.locals.session !== undefined
		) {
			return resolve(event);
		}

		const location = signInLocation(event.url);
		if (event.isDataRequest) redirect(303, location);

		const response = new Response(null, {
			status: 303,
			headers: { Location: location, 'Cache-Control': 'private, no-store' }
		});
		// A response built here never passes through Kit's `resolve`, which is what writes the
		// queued cookies: repeat the deletion `handleSession` queued (S5) on the 303.
		if (event.locals.sessionCookieCleared === true) {
			response.headers.append(
				'Set-Cookie',
				serializeSessionCookieDeletion(event.cookies, cookieName)
			);
		}
		return response;
	};
}
