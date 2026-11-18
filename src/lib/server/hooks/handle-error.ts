import type { HandleServerError } from '@sveltejs/kit/hooks';

/** One structured log line for an unexpected error. */
export type ErrorLogEntry = {
	readonly traceId: string;
	readonly method: string;
	readonly route: string | null;
	readonly status: number;
	readonly error: unknown;
};

/** What {@link createHandleError} needs from the outside world. */
export type HandleErrorDeps = {
	readonly log: (entry: ErrorLogEntry) => void;
	readonly newTraceId: () => string;
};

/** Codes `handleError` gives to errors the app did not throw with `error()`. */
export const unexpectedErrorCodes = {
	notFound: 'workspace.route.not_found',
	rejected: 'workspace.request.rejected',
	invalid: 'workspace.request.invalid',
	unexpected: 'workspace.server.unexpected'
} as const;

/**
 * A random 32-hex id in the W3C trace-id format. It joins the response and its log line until
 * the OTel SDK lands (OPS-03); then the active span's trace id replaces it.
 */
export function randomTraceId(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Builds the server `handleError` hook (SEC-05, RMT-03). Errors thrown with `error()` pass
 * through untouched; framework and validation errors get a generic code and Kit's safe message;
 * unexpected errors are logged and answered with a generic code and the trace id of that log
 * line. Nothing internal reaches the response.
 */
export function createHandleError({ log, newTraceId }: HandleErrorDeps): HandleServerError {
	return ({ kind, error, event }) => {
		if (kind === 'app') return error;

		// Kit's message for these is already safe; no trace id, since nothing is logged for them.
		if (kind === 'validation') return { code: unexpectedErrorCodes.invalid };
		if (kind === 'framework') {
			const code =
				error.status === 404 ? unexpectedErrorCodes.notFound : unexpectedErrorCodes.rejected;
			return { code };
		}

		const traceId = newTraceId();
		log({
			traceId,
			method: event.request.method,
			route: event.route.id,
			status: 500,
			error
		});
		// `message` is omitted on purpose: Kit then answers its generic 'Internal Error'.
		return { code: unexpectedErrorCodes.unexpected, traceId };
	};
}

/** The production hook. `console.error` stands in until the pino logger lands (OPS-03). */
export const handleError: HandleServerError = createHandleError({
	log: (entry) => {
		console.error('unexpected error', entry);
	},
	newTraceId: randomTraceId
});
