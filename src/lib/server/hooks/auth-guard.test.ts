import type { RequestEvent } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { FakeCookies } from '../../../../tests/setup/fake-cookies';
import { fakeRequestEvent } from '../../../../tests/support/request-event';
import type { Session } from '../session/session';
import { createHandleAuthGuard } from './auth-guard';
import { handleSecurityHeaders, securityHeaders } from './security-headers';

const cookieName = '__Host-workspace-sid';
const handleAuthGuard = createHandleAuthGuard({ cookieName });
const session: Session = {
	sessionId: '0198c1d2-8f00-7000-8000-000000000005',
	token: 'secret-token-value',
	absoluteExpiresAt: '2026-06-01T12:00:00Z',
	idleExpiresAt: '2026-06-01T11:00:00Z'
};

type SetupInit = {
	readonly url?: string;
	readonly routeId?: string | null;
	readonly headers?: Record<string, string>;
	readonly cookieCleared?: boolean;
	readonly session?: Session;
	readonly isDataRequest?: boolean;
	readonly isRemoteRequest?: boolean;
};

function setup({
	session: stored,
	isDataRequest,
	isRemoteRequest,
	cookieCleared = false,
	...init
}: SetupInit = {}) {
	const event: RequestEvent = {
		...fakeRequestEvent(init),
		cookies: new FakeCookies(),
		...(isDataRequest === undefined ? {} : { isDataRequest }),
		...(isRemoteRequest === undefined ? {} : { isRemoteRequest })
	};
	if (stored !== undefined) event.locals.session = stored;
	if (cookieCleared) event.locals.sessionCookieCleared = true;
	let resolved = 0;
	const resolve = () => {
		resolved += 1;
		return Promise.resolve(new Response('page'));
	};
	return {
		event,
		resolve,
		resolvedCount: () => resolved,
		run: () => handleAuthGuard({ event, resolve })
	};
}

describe('handleAuthGuard policy by route.id', () => {
	it.each([
		['a public route', '/(public)'],
		['a route under (public)', '/(public)/about'],
		['the liveness probe', '/health/live'],
		['the readiness probe', '/health/ready']
	])('lets an anonymous request for %s through', async (_name, routeId) => {
		const { run, resolvedCount } = setup({ routeId });

		const response = await run();

		expect({ status: response.status, resolved: resolvedCount() }).toStrictEqual({
			status: 200,
			resolved: 1
		});
	});

	it('lets a null route through to the 404, so /sign-in does not loop while it is missing', async () => {
		const { run, resolvedCount } = setup({ routeId: null, url: 'http://localhost/sign-in' });

		const response = await run();

		expect({ status: response.status, resolved: resolvedCount() }).toStrictEqual({
			status: 200,
			resolved: 1
		});
	});

	it('lets a remote request through untouched, even with a spoofed x-sveltekit-pathname', async () => {
		const { run, resolvedCount } = setup({
			routeId: '/(app)/orders',
			isRemoteRequest: true,
			headers: { 'x-sveltekit-pathname': '/health/live' }
		});

		const response = await run();

		expect({ status: response.status, resolved: resolvedCount() }).toStrictEqual({
			status: 200,
			resolved: 1
		});
	});

	it.each(['/(public)-admin', '/health-admin', '/healthz', '/health/other', '/[[lang]]/orders'])(
		'redirects an anonymous request for the protected route %s',
		async (routeId) => {
			const { run, resolvedCount } = setup({ routeId, url: 'http://localhost/x' });

			const response = await run();

			expect({
				status: response.status,
				location: response.headers.get('location'),
				resolved: resolvedCount()
			}).toStrictEqual({ status: 303, location: '/sign-in?next=%2Fx', resolved: 0 });
		}
	);

	it('decides by route.id, never by the URL path or a spoofed header', async () => {
		const { run } = setup({
			routeId: '/(app)/orders',
			url: 'http://localhost/health/live',
			headers: { 'x-sveltekit-pathname': '/health/live' }
		});

		const response = await run();

		expect({ status: response.status, location: response.headers.get('location') }).toStrictEqual({
			status: 303,
			location: '/sign-in?next=%2Fhealth%2Flive'
		});
	});

	it('lets a request with a session through to a protected route', async () => {
		const { run, resolvedCount } = setup({ routeId: '/(app)/orders', session });

		const response = await run();

		expect({ status: response.status, resolved: resolvedCount() }).toStrictEqual({
			status: 200,
			resolved: 1
		});
	});
});

describe('handleAuthGuard redirect', () => {
	it('keeps the path and query of the request in next', async () => {
		const { run } = setup({
			routeId: '/(app)/orders',
			url: 'http://localhost/es/orders?page=2&q=a%20b'
		});

		const response = await run();

		expect(response.headers.get('location')).toBe(
			`/sign-in?next=${encodeURIComponent('/es/orders?page=2&q=a%20b')}`
		);
	});

	it('answers a 303 without a body that is private and uncached', async () => {
		const { run } = setup({ routeId: '/(app)/orders' });

		const response = await run();

		expect({
			status: response.status,
			cache: response.headers.get('cache-control'),
			body: await response.text()
		}).toStrictEqual({ status: 303, cache: 'private, no-store', body: '' });
	});

	it('carries every security header once the security-headers hook wraps it', async () => {
		const { event, resolve } = setup({ routeId: '/(app)/orders' });

		const response = await handleSecurityHeaders({
			event,
			resolve: () => Promise.resolve(handleAuthGuard({ event, resolve }))
		});

		const headers = Object.fromEntries(
			Object.keys(securityHeaders).map((name) => [name, response.headers.get(name)])
		);
		expect({ status: response.status, headers }).toStrictEqual({
			status: 303,
			headers: securityHeaders
		});
	});

	it('repeats the deletion handleSession queued, which Kit would not write on this response', async () => {
		const { run } = setup({ routeId: '/(app)/orders', cookieCleared: true });

		const response = await run();

		expect(response.headers.get('set-cookie')).toBe(
			`${cookieName}=; path=/; httpOnly; secure; maxAge=0`
		);
	});

	it('sets no cookie when handleSession deleted none', async () => {
		const { run } = setup({ routeId: '/(app)/orders' });

		const response = await run();

		expect(response.headers.get('set-cookie')).toBeNull();
	});

	it("throws Kit's redirect for a data request", async () => {
		const { run } = setup({
			routeId: '/(app)/orders',
			url: 'http://localhost/orders',
			isDataRequest: true
		});

		await expect(run()).rejects.toMatchObject({
			status: 303,
			location: '/sign-in?next=%2Forders'
		});
	});
});
