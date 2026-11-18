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
	test('an anonymous page is private, uncached and carries the security headers', async ({
		request
	}) => {
		const response = await request.get(`${baseURL}/`);
		expect(response.status()).toBe(200);
		const headers = response.headers();
		expect(headers['cache-control']).toBe('private, no-store');
		expect(headers['set-cookie']).toBeUndefined();
		expect(headers['content-security-policy']).toBeTruthy();
		expect(headers['strict-transport-security']).toContain('max-age=63072000');
		expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
		expect(headers['cross-origin-opener-policy']).toBe('same-origin');
		expect(headers['permissions-policy']).toBeTruthy();
	});

	test('a malformed sid is answered as anonymous and its cookie is deleted', async ({
		request
	}) => {
		const response = await request.get(`${baseURL}/`, {
			headers: { cookie: `${cookieName}=not-a-sid` }
		});
		expect(response.status()).toBe(200);
		const setCookie = response.headers()['set-cookie'] ?? '';
		expect(setCookie).toContain(`${cookieName}=;`);
		expect(setCookie).toMatch(/Path=\//i);
		expect(setCookie).toMatch(/HttpOnly/i);
		expect(setCookie).toMatch(/Secure/i);
	});
});
