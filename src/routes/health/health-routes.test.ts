import { describe, expect, it } from 'vitest';
import { FakeSessionStore } from '../../../tests/setup/fake-session-store';
import { fakeRequestEvent } from '../../../tests/support/request-event';
import { GET as live } from './live/+server';
import { GET as ready } from './ready/+server';

type LiveEvent = Parameters<typeof live>[0];
type ReadyEvent = Parameters<typeof ready>[0];

function locals(store: FakeSessionStore): LiveEvent['locals'] {
	return { app: { sessionStore: store } };
}

function readyEvent(store: FakeSessionStore): ReadyEvent {
	return { ...fakeRequestEvent(), route: { id: '/health/ready' }, locals: locals(store) };
}

describe('the health routes mounted in SvelteKit', () => {
	it('GET /health/live answers 200 without touching the store', async () => {
		const store = new FakeSessionStore();

		const response = await live({
			...fakeRequestEvent(),
			route: { id: '/health/live' },
			locals: locals(store)
		});

		expect({
			status: response.status,
			body: await response.text(),
			calls: store.calls
		}).toStrictEqual({ status: 200, body: '{"status":"ok"}', calls: [] });
	});

	it.each([
		{ failing: false, status: 200, body: '{"status":"ok"}' },
		{ failing: true, status: 503, body: '{"status":"unavailable"}' }
	])(
		'GET /health/ready answers $status when failing is $failing',
		async ({ failing, status, body }) => {
			const store = new FakeSessionStore();
			store.failing = failing;

			const response = await ready(readyEvent(store));

			expect({
				status: response.status,
				body: await response.text(),
				calls: store.calls
			}).toStrictEqual({ status, body, calls: [{ operation: 'ping' }] });
		}
	);
});
