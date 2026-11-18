import pino, { type DestinationStream, type Logger } from 'pino';

/** Paths whose values never reach a log line (SEC-05); pino prints `***` in their place. */
export const redactPaths = [
	'token',
	'*.token',
	'sid',
	'*.sid',
	'req.headers.cookie',
	'req.headers.authorization',
	'*.headers.cookie',
	'*.headers.authorization',
	'*.headers["set-cookie"]',
	'err.command',
	'*.err.command'
];

/**
 * The one structured logger: JSON lines, secrets redacted. Created once in `hooks.server.ts`
 * and passed into the hook factories; `destination` defaults to stdout and exists for tests.
 */
export function createLogger(destination?: DestinationStream): Logger {
	return pino({ redact: { paths: redactPaths, censor: '***' } }, destination);
}
