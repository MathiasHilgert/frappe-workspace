import type { ServerInit } from '@sveltejs/kit/hooks';
import { FRAPPE_API_ATTEMPT_TIMEOUT_MS, FRAPPE_API_TOTAL_TIMEOUT_MS } from '$app/env/private';
import { handleParaglide } from '#lib/server/hooks/paraglide.js';
import { verifyStartupConfig } from '#lib/server/hooks/startup.js';

export const init: ServerInit = () => {
	verifyStartupConfig({
		attemptMs: FRAPPE_API_ATTEMPT_TIMEOUT_MS,
		totalMs: FRAPPE_API_TOTAL_TIMEOUT_MS
	});
};

export const handle = handleParaglide;
