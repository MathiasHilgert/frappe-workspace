import { describe, expect, it } from 'vitest';
import { FakeCookies } from '../../../../tests/setup/fake-cookies';
import { FakeSessionStore } from '../../../../tests/setup/fake-session-store';
import { fakeRequestEvent } from '../../../../tests/support/request-event';
import type { Clock } from '../clock';
import type { Session } from '../session/session';
import { createHandleSession } from './session';
import { handleSecurityHeaders, securityHeaders } from './security-headers';

const cookieName = '__Host-workspace-sid';
const sid = 's'.repeat(43);
const now = Temporal.Instant.from('2026-06-01T10:00:00Z');
const clock: Clock = { now: () => now };
const session: Session = {
	sessionId: '0198c1d2-8f00-7000-8000-000000000005',
	token: 'secret-token-value',
	absoluteExpiresAt: '2026-06-01T12:00:00Z',
	idleExpiresAt: '2026-06-01T11:00:00Z'
};

type SetupInit = {
	readonly cookie?: string;
	readonly routeId?: string | null;
	readonly isDataRequest?: boolean;
	readonly isRemoteRequest?: boolean;
};

function setup({ cookie, routeId = '/', isDataRequest, isRemoteRequest }: SetupInit = {}) {
	const store = new FakeSessionStore();
	const cookies = new FakeCookies(cookie === undefined ? {} : { [cookieName]: cookie });
	const logged: { entry: object; message: string | undefined }[] = [];
	const handle = createHandleSession({
		store,
		cookieName,
		clock,
		log: {
			error: (entry: object, message?: string) => {
				logged.push({ entry, message });
			}
		}
	});
	const event = {
		...fakeRequestEvent({ routeId }),
		cookies,
		...(isDataRequest === undefined ? {} : { isDataRequest }),
		...(isRemoteRequest === undefined ? {} : { isRemoteRequest })
	};
	const seen: { session: Session | undefined }[] = [];
	const resolve = () => {
		seen.push({ session: event.locals.session });
		return Promise.resolve(new Response('page'));
	};
	const run = () => handle({ event, resolve });
	return { store, cookies, logged, event, seen, run, handle, resolve };
}

describe('handleSession with a stored session', () => {
	it('treats a session whose absoluteExpiresAt equals now as expired', async () => {
		const { store, cookies, run, seen } = setup({ cookie: sid });
		store.sessions.set(sid, { ...session, absoluteExpiresAt: now.toString() });

		await run();

		expect(seen).toStrictEqual([{ session: undefined }]);
		expect(cookies.writes).toMatchObject([{ kind: 'delete', name: cookieName }]);
	});

	it('puts the session on locals and answers with private, no-store caching', async () => {
		const { store, run, seen } = setup({ cookie: sid });
		store.sessions.set(sid, session);

		const response = await run();

		expect({
			seen,
			cache: response.headers.get('cache-control'),
			status: response.status
		}).toStrictEqual({
			seen: [{ session }],
			cache: 'private, no-store',
			status: 200
		});
	});
});

describe('handleSession without a usable cookie', () => {
	it('leaves locals.session undefined and never calls the store when there is no cookie', async () => {
		const { store, cookies, run, seen } = setup();

		const response = await run();

		expect(response.headers.get('cache-control')).toBe('private, no-store');

		expect({ seen, calls: store.calls, writes: cookies.writes }).toStrictEqual({
			seen: [{ session: undefined }],
			calls: [],
			writes: []
		});
	});

	it.each(['', 'short', 'x'.repeat(44), `${'x'.repeat(42)}!`])(
		'deletes the malformed cookie %j without calling the store',
		async (cookie) => {
			const { store, cookies, run, seen } = setup({ cookie });

			await run();

			expect({ seen, calls: store.calls }).toStrictEqual({
				seen: [{ session: undefined }],
				calls: []
			});
			expect(cookies.writes).toStrictEqual([
				{ kind: 'delete', name: cookieName, options: { path: '/', secure: true, httpOnly: true } }
			]);
		}
	);

	it('flags the deletion in locals so the guard can repeat it on its 303', async () => {
		const { event, run } = setup({ cookie: sid });

		await run();

		expect(event.locals.sessionCookieCleared).toBe(true);
	});

	it('flags the deletion of a malformed cookie', async () => {
		const { event, run } = setup({ cookie: 'short' });

		await run();

		expect(event.locals.sessionCookieCleared).toBe(true);
	});

	it('flags the deletion of an expired session', async () => {
		const { store, event, run } = setup({ cookie: sid });
		store.sessions.set(sid, { ...session, absoluteExpiresAt: '2026-06-01T09:59:59Z' });

		await run();

		expect(event.locals.sessionCookieCleared).toBe(true);
	});

	it('does not flag a live session nor a request without a cookie', async () => {
		const live = setup({ cookie: sid });
		live.store.sessions.set(sid, session);
		const none = setup();

		await live.run();
		await none.run();

		expect([
			live.event.locals.sessionCookieCleared,
			none.event.locals.sessionCookieCleared
		]).toStrictEqual([undefined, undefined]);
	});

	it('deletes the cookie when no session is stored for the sid', async () => {
		const { cookies, run, seen } = setup({ cookie: sid });

		await run();

		expect(seen).toStrictEqual([{ session: undefined }]);
		expect(cookies.writes).toStrictEqual([
			{ kind: 'delete', name: cookieName, options: { path: '/', secure: true, httpOnly: true } }
		]);
	});

	it('deletes the cookie and ignores a stored session whose absoluteExpiresAt is in the past', async () => {
		const { store, cookies, run, seen } = setup({ cookie: sid });
		store.sessions.set(sid, { ...session, absoluteExpiresAt: '2026-06-01T09:59:59Z' });

		await run();

		expect(seen).toStrictEqual([{ session: undefined }]);
		expect(cookies.writes).toMatchObject([{ kind: 'delete', name: cookieName }]);
	});
});

describe('handleSession on health routes', () => {
	it.each(['/health/live', '/health/ready'] as const)(
		'skips the store entirely on %s, even with a cookie',
		async (routeId) => {
			const { store, cookies, run, seen } = setup({ cookie: sid, routeId });
			store.sessions.set(sid, session);

			const response = await run();

			expect({
				seen,
				calls: store.calls,
				writes: cookies.writes,
				cache: response.headers.get('cache-control')
			}).toStrictEqual({ seen: [{ session: undefined }], calls: [], writes: [], cache: null });
		}
	);
});

describe('handleSession beside the health routes', () => {
	it.each(['/health/other', '/health/live/x'])('still reads the store on %s', async (routeId) => {
		const { store, run } = setup({ cookie: sid, routeId });
		store.sessions.set(sid, session);

		await run();

		expect(store.calls).toStrictEqual([{ operation: 'read', sid }]);
	});
});

describe('handleSession during a Valkey outage (SEC-03)', () => {
	it('answers a page request with a 503 { code, message } body, no-store, no cookie change, one attempt, and logs only safe fields', async () => {
		const { store, cookies, logged, run, seen } = setup({ cookie: sid });
		store.failing = true;

		const response = await run();

		expect(response.status).toBe(503);
		expect(await response.json()).toStrictEqual({
			code: 'workspace.session.unavailable',
			message: 'The service is temporarily unavailable. Try again in a moment.'
		});
		expect({
			cache: response.headers.get('cache-control'),
			setCookie: response.headers.get('set-cookie'),
			writes: cookies.writes,
			reads: store.calls.length,
			resolved: seen.length
		}).toStrictEqual({ cache: 'no-store', setCookie: null, writes: [], reads: 1, resolved: 0 });
		expect(logged).toStrictEqual([
			{
				entry: {
					operation: 'read',
					kind: 'unavailable',
					errorName: 'Error',
					errorCode: 'ECONNREFUSED'
				},
				message: 'session store unavailable'
			}
		]);
		expect(JSON.stringify(logged)).not.toContain(sid);
	});

	it('carries every security header on that 503 once handleSecurityHeaders wraps it (S13)', async () => {
		const { store, event, handle, resolve } = setup({ cookie: sid });
		store.failing = true;

		// What `sequence` does: the outer hook's `resolve` runs the inner hook.
		const response = await handleSecurityHeaders({
			event,
			resolve: () => Promise.resolve(handle({ event, resolve }))
		});

		const headers = Object.fromEntries(
			Object.keys(securityHeaders).map((name) => [name, response.headers.get(name)])
		);
		expect({ status: response.status, headers }).toStrictEqual({
			status: 503,
			headers: securityHeaders
		});
	});

	it.each([{ isDataRequest: true }, { isRemoteRequest: true }])(
		"throws Kit's 503 error for %j",
		async (kind) => {
			const { store, run } = setup({ cookie: sid, ...kind });
			store.failing = true;

			await expect(run()).rejects.toMatchObject({
				status: 503,
				body: {
					code: 'workspace.session.unavailable',
					message: 'The service is temporarily unavailable. Try again in a moment.'
				}
			});
		}
	);
});
