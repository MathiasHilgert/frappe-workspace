import { describe, expect, it } from 'vitest';
import { fakeRequestEvent } from '../../../../tests/support/request-event';
import { createHandleError, randomTraceId, type ErrorLogEntry } from './handle-error';

function setup() {
	const logged: ErrorLogEntry[] = [];
	const handleError = createHandleError({
		log: (entry) => {
			logged.push(entry);
		},
		newTraceId: () => 'generated-trace-id'
	});
	return { handleError, logged };
}

describe('handleError', () => {
	it('passes an error thrown with error() through untouched, without a trace id or a log line', async () => {
		const { handleError, logged } = setup();
		const thrown = { status: 404, message: 'Workspace not found', code: 'workspace.not_found' };

		const body = await handleError({ kind: 'app', error: thrown, event: fakeRequestEvent() });

		expect({ body, logged }).toStrictEqual({ body: thrown, logged: [] });
	});

	it('answers an unexpected error with a generic code and a trace id, logging the error', async () => {
		const { handleError, logged } = setup();
		const bug = new Error('db password is hunter2');

		const body = await handleError({
			kind: 'unknown',
			error: bug,
			event: fakeRequestEvent({ method: 'POST', routeId: '/' })
		});

		expect({ body, logged }).toStrictEqual({
			body: { code: 'workspace.server.unexpected', traceId: 'generated-trace-id' },
			logged: [
				{
					traceId: 'generated-trace-id',
					method: 'POST',
					route: '/',
					status: 500,
					error: bug
				}
			]
		});
	});

	it("gives an unknown route the not-found code and keeps Kit's safe message", async () => {
		const { handleError, logged } = setup();

		const body = await handleError({
			kind: 'framework',
			error: { status: 404, message: 'Not Found' },
			event: fakeRequestEvent()
		});

		expect({ body, logged }).toStrictEqual({
			body: { code: 'workspace.route.not_found' },
			logged: []
		});
	});

	it('gives any other framework error the rejected code', async () => {
		const { handleError } = setup();

		const body = await handleError({
			kind: 'framework',
			error: { status: 405, message: 'Method Not Allowed' },
			event: fakeRequestEvent()
		});

		expect(body).toMatchObject({ code: 'workspace.request.rejected' });
	});

	it('answers invalid remote-function input with the invalid code and no issue details', async () => {
		const { handleError, logged } = setup();

		const body = await handleError({
			kind: 'validation',
			error: { status: 400, message: 'Bad Request' },
			issues: [{ message: 'Expected uuid, received "secret-value"' }],
			event: fakeRequestEvent()
		});

		expect({ body, logged }).toStrictEqual({
			body: { code: 'workspace.request.invalid' },
			logged: []
		});
	});
});

describe('randomTraceId', () => {
	it('returns 32 lowercase hex characters, like a W3C trace id', () => {
		expect(randomTraceId()).toMatch(/^[0-9a-f]{32}$/);
	});
});
