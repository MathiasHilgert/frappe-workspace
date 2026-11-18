import { describe, expect, it } from 'vitest';
import { fakeRequestEvent } from '../../../../tests/support/request-event';
import { handleSecurityHeaders } from './security-headers';

describe('handleSecurityHeaders', () => {
	it('adds HSTS, Referrer-Policy, a denying Permissions-Policy and COOP to the response', async () => {
		const resolve = () => Promise.resolve(new Response('ok', { headers: { 'X-Kept': 'yes' } }));

		const response = await handleSecurityHeaders({ event: fakeRequestEvent(), resolve });

		expect(Object.fromEntries(response.headers)).toMatchObject({
			'strict-transport-security': 'max-age=63072000; includeSubDomains',
			'referrer-policy': 'strict-origin-when-cross-origin',
			'permissions-policy':
				'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
			'cross-origin-opener-policy': 'same-origin',
			'x-kept': 'yes'
		});
	});
});
