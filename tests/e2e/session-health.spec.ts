import { expect, test } from '@playwright/test';

// TEST-01: critical flows only. S5 (malformed cookie), S10 (health), S13 (cache and headers).
const baseURL = 'http://localhost:4173';
const cookieName = '__Host-workspace-sid';

test.describe('health probes', () => {
	test('live answers a static 200 without caching', async ({ request }) => {
		const response = await request.get(`${baseURL}/health/live`);
		expect(response.status()).toBe(200);
		expect(await response.json()).toEqual({ status: 'ok' });
		expect(response.headers()['cache-control']).toBe('no-store');
	});

	test('ready answers a static 200 while Valkey answers', async ({ request }) => {
		const response = await request.get(`${baseURL}/health/ready`);
		expect(response.status()).toBe(200);
		expect(await response.json()).toEqual({ status: 'ok' });
		expect(response.headers()['cache-control']).toBe('no-store');
	});
});

test.describe('session cookie', () => {
	test('an anonymous visit to a protected page is a private 303 with the security headers', async ({
		request
	}) => {
		const response = await request.get(`${baseURL}/`, { maxRedirects: 0 });
		expect(response.status()).toBe(303);
		const headers = response.headers();
		expect(headers.location).toBe('/sign-in?next=%2F');
		expect(headers['cache-control']).toBe('private, no-store');
		expect(headers['set-cookie']).toBeUndefined();
		// Kit writes the CSP only on pages it renders; a bodiless 303 has no document to protect.
		expect(headers['strict-transport-security']).toContain('max-age=63072000');
		expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
		expect(headers['cross-origin-opener-policy']).toBe('same-origin');
		expect(headers['permissions-policy']).toBeTruthy();
	});

	test('a malformed sid is answered as anonymous and its cookie is deleted', async ({
		request
	}) => {
		const response = await request.get(`${baseURL}/`, {
			headers: { cookie: `${cookieName}=not-a-sid` },
			maxRedirects: 0
		});
		expect(response.status()).toBe(303);
		const setCookie = response.headers()['set-cookie'] ?? '';
		expect(setCookie).toContain(`${cookieName}=;`);
		expect(setCookie).toMatch(/Path=\//i);
		expect(setCookie).toMatch(/HttpOnly/i);
		expect(setCookie).toMatch(/Secure/i);
	});

	test('a well-formed sid with no stored session gets the same 303 and a deletion', async ({
		request
	}) => {
		const sid = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
		const response = await request.get(`${baseURL}/`, {
			headers: { cookie: `${cookieName}=${sid}` },
			maxRedirects: 0
		});
		expect(response.status()).toBe(303);
		expect(response.headers().location).toBe('/sign-in?next=%2F');
		expect(response.headers()['set-cookie'] ?? '').toContain(`${cookieName}=;`);
	});
});

test.describe('auth guard', () => {
	test('a protected route keeps its path and query in next', async ({ request }) => {
		const response = await request.get(`${baseURL}/?a=1&b=2`, { maxRedirects: 0 });
		expect(response.status()).toBe(303);
		expect(response.headers().location).toBe('/sign-in?next=%2F%3Fa%3D1%26b%3D2');
	});

	test('a spoofed x-sveltekit-pathname does not open a protected page', async ({ request }) => {
		const response = await request.get(`${baseURL}/`, {
			headers: { 'x-sveltekit-pathname': '/health/live' },
			maxRedirects: 0
		});
		expect(response.status()).toBe(303);
	});

	test('a data request gets Kit redirect form', async ({ request }) => {
		const response = await request.get(`${baseURL}/__data.json`);
		expect(await response.json()).toEqual({
			type: 'redirect',
			status: 303,
			location: '/sign-in?next=%2F'
		});
	});

	test('/sign-in answers 404 with the CSP and no redirect, so there is no loop', async ({
		request
	}) => {
		const response = await request.get(`${baseURL}/sign-in?next=%2F`, { maxRedirects: 0 });
		expect(response.status()).toBe(404);
		expect(response.headers().location).toBeUndefined();
		expect(response.headers()['content-security-policy']).toBeTruthy();
	});
});
