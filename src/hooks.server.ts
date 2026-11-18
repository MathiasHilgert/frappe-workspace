import type { ServerInit } from '@sveltejs/kit/hooks';
import { sequence } from '@sveltejs/kit/hooks';
import { FRAPPE_API_ATTEMPT_TIMEOUT_MS, FRAPPE_API_TOTAL_TIMEOUT_MS } from '$app/env/private';
import { handleParaglide } from '#lib/server/hooks/paraglide.js';
import { handleSecurityHeaders } from '#lib/server/hooks/security-headers.js';
import { verifyStartupConfig } from '#lib/server/hooks/startup.js';

export { handleError } from '#lib/server/hooks/handle-error.js';

export const init: ServerInit = () => {
	verifyStartupConfig({
		attemptMs: FRAPPE_API_ATTEMPT_TIMEOUT_MS,
		totalMs: FRAPPE_API_TOTAL_TIMEOUT_MS
	});
};

// ARCH-04: handleTelemetry, handleSession, handleComposition and handleAuthGuard join this
// sequence with the OTel SDK, the Valkey session store and the first frappe-api gateway.
export const handle = sequence(handleParaglide, handleSecurityHeaders);
