import type { Cookies } from '@sveltejs/kit';
import { ok, type Result } from '#lib/shared/kernel/result.js';
import type { Session } from './session';
import type { SessionStore } from './session-store';
import { isSid, newSid } from './sid';

/** What {@link startSession} and {@link endSession} need; `cookieName` is `SESSION_COOKIE_NAME`. */
export type SessionCookieDeps = {
	readonly store: Pick<SessionStore, 'save' | 'delete'>;
	readonly cookies: Cookies;
	readonly cookieName: string;
};

/** Attributes of the session cookie (SEC-01): no `Domain`, as `__Host-` requires. */
const cookieAttributes = { path: '/', httpOnly: true, secure: true } as const;

/**
 * Drops the session cookie. Browsers ignore the deletion of a `__Host-` cookie unless it repeats
 * `Path`, `Secure` and `HttpOnly` (S5).
 */
export function deleteSessionCookie(cookies: Cookies, cookieName: string): void {
	cookies.delete(cookieName, { ...cookieAttributes });
}

/**
 * The `Set-Cookie` line {@link deleteSessionCookie} queues, for a response built outside Kit's
 * `resolve` (which is what writes queued cookies), such as the guard's 303.
 */
export function serializeSessionCookieDeletion(cookies: Cookies, cookieName: string): string {
	return cookies.serialize(cookieName, '', { ...cookieAttributes, maxAge: 0 });
}

/**
 * Opens the BFF session for a login (SEC-01, SEC-02): a new sid, the session stored until its
 * `absoluteExpiresAt`, and the cookie expiring then. The key of any sid the request already
 * carried is deleted first, so a sid planted before login never becomes authenticated (S12).
 * Nothing calls it yet; the sign-in feature will.
 */
export async function startSession(
	{ store, cookies, cookieName }: SessionCookieDeps,
	session: Session
): Promise<Result<undefined>> {
	const carried = cookies.get(cookieName);
	if (carried !== undefined && isSid(carried)) {
		const deleted = await store.delete(carried);
		if (!deleted.ok) return deleted;
	}

	const sid = newSid();
	const saved = await store.save(sid, session);
	if (!saved.ok) return saved;

	cookies.set(cookieName, sid, {
		...cookieAttributes,
		sameSite: 'lax',
		// eslint-disable-next-line no-restricted-globals -- TS-04: Kit's cookie API takes a Date, converted at this edge
		expires: new Date(Temporal.Instant.from(session.absoluteExpiresAt).epochMilliseconds)
	});
	return ok(undefined);
}

/**
 * Ends the session of the request (SEC-02): deletes its key and the cookie. The cookie goes even
 * when the store fails, and the failure is returned for the caller to report.
 */
export async function endSession({
	store,
	cookies,
	cookieName
}: SessionCookieDeps): Promise<Result<undefined>> {
	const sid = cookies.get(cookieName);
	const deleted = sid !== undefined && isSid(sid) ? await store.delete(sid) : ok(undefined);
	deleteSessionCookie(cookies, cookieName);
	return deleted;
}
