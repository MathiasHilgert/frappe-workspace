import { describe, expect, it } from 'vitest';
import { FakeSessionStore } from '../../../../tests/setup/fake-session-store';
import { fakeRequestEvent } from '../../../../tests/support/request-event';
import { createHandleComposition } from './composition';

describe('handleComposition', () => {
	it('gives the request locals.app with the store ping only, never save or delete', async () => {
		const sessionStore = new FakeSessionStore();
		const event = fakeRequestEvent();
		let seen: object | undefined;

		await createHandleComposition({ sessionStore })({
			event,
			resolve: () => {
				seen = event.locals.app.sessionStore;
				return Promise.resolve(new Response('page'));
			}
		});

		expect(Object.keys(seen ?? {})).toStrictEqual(['ping']);
		expect(await event.locals.app.sessionStore.ping()).toStrictEqual({
			ok: true,
			value: undefined
		});
		expect(sessionStore.calls).toStrictEqual([{ operation: 'ping' }]);
	});
});
