import type { Handle } from '@sveltejs/kit/hooks';

/**
 * Response headers set on every response (SEC-04). The CSP itself comes from `csp` in
 * `vite.config.ts`, which Kit fills with per-request nonces.
 */
export const securityHeaders: Readonly<Record<string, string>> = {
	'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy':
		'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
	'Cross-Origin-Opener-Policy': 'same-origin'
};

/** Adds {@link securityHeaders} to every response. */
export const handleSecurityHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	for (const [name, value] of Object.entries(securityHeaders)) {
		response.headers.set(name, value);
	}
	return response;
};
