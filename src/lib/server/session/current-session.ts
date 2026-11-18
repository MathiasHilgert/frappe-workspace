import { redirect } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import type { Session } from './session';
import { signInLocation } from './sign-in-redirect';

/** The session of the current request, or `undefined` when it is anonymous (RMT-02). */
export function getSession(): Session | undefined {
	return getRequestEvent().locals.session;
}

/**
 * The session of the current request, or a `redirect(303, '/sign-in')` for an anonymous one
 * (RMT-02). It never reads `event.url`: Kit throws when a remote `query` does, so the redirect
 * carries no `next`.
 */
export function requireSession(): Session {
	const session = getSession();
	if (session === undefined) redirect(303, signInLocation());
	return session;
}
