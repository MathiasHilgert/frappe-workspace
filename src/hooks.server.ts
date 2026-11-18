import type { ServerInit } from '@sveltejs/kit/hooks';
import { sequence } from '@sveltejs/kit/hooks';
import { Redis } from 'ioredis';
import {
	FRAPPE_API_ATTEMPT_TIMEOUT_MS,
	FRAPPE_API_TOTAL_TIMEOUT_MS,
	SESSION_COOKIE_NAME,
	VALKEY_COMMAND_TIMEOUT_MS,
	VALKEY_URL
} from '$app/env/private';
import { systemClock } from '#lib/server/clock.js';
import { createHandleComposition } from '#lib/server/hooks/composition.js';
import { createHandleError, randomTraceId } from '#lib/server/hooks/handle-error.js';
import { createHandleSession } from '#lib/server/hooks/session.js';
import { handleParaglide } from '#lib/server/hooks/paraglide.js';
import { handleSecurityHeaders } from '#lib/server/hooks/security-headers.js';
import { verifyStartupConfig } from '#lib/server/hooks/startup.js';
import { createLogger } from '#lib/server/logger.js';
import { clientErrorFields, createSessionStore } from '#lib/server/session/session-store.js';

const log = createLogger();

export const handleError = createHandleError({ log, newTraceId: randomTraceId });

/** Longest `init` waits for the first Valkey connection before serving anyway. */
const VALKEY_READY_WAIT_MS = 5_000;

export const init: ServerInit = async () => {
	verifyStartupConfig({
		attemptMs: FRAPPE_API_ATTEMPT_TIMEOUT_MS,
		totalMs: FRAPPE_API_TOTAL_TIMEOUT_MS
	});
	// With no offline queue a command sent before the connection is ready fails and answers 503, so
	// wait for it, bounded: a Valkey that never answers must not keep the server from starting.
	if (valkey.status === 'ready') return;
	await new Promise<void>((resolve) => {
		const timer = setTimeout(resolve, VALKEY_READY_WAIT_MS);
		valkey.once('ready', () => {
			clearTimeout(timer);
			resolve();
		});
	});
};

// One Valkey client per process (S12). SEC-03: no retry, no offline queue and a short command
// timeout, so an outage answers 503 at once instead of piling requests up. `rediss://` makes
// ioredis verify the server certificate.
const valkey = new Redis(VALKEY_URL, {
	commandTimeout: VALKEY_COMMAND_TIMEOUT_MS,
	maxRetriesPerRequest: 0,
	enableOfflineQueue: false
});
// A connection error is an event, not a throw; log only its name and code (SEC-05).
valkey.on('error', (error) => {
	log.warn({ operation: 'connect', ...clientErrorFields(error) }, 'valkey connection error');
});

// adapter-bun emits this once in-flight requests finished (SIGTERM or SIGINT): close Valkey cleanly.
process.on('sveltekit:shutdown', () => {
	void valkey.quit().catch(() => {
		valkey.disconnect();
	});
});

const sessionStore = createSessionStore(valkey, systemClock);

// ARCH-04: handleTelemetry and handleAuthGuard join this sequence with the OTel SDK and the guard.
export const handle = sequence(
	handleParaglide,
	handleSecurityHeaders,
	createHandleSession({
		store: sessionStore,
		cookieName: SESSION_COOKIE_NAME,
		clock: systemClock,
		log
	}),
	createHandleComposition({ sessionStore })
);
