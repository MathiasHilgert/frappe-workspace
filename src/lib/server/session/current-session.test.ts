import { describe, expect, it, vi } from 'vitest';
import { fakeRequestEvent } from '../../../../tests/support/request-event';
import type { Session } from './session';

const current = vi.hoisted(() => {
	const holder: { event: unknown } = { event: undefined };
	return holder;
});
vi.mock('$app/server', () => ({ getRequestEvent: () => current.event }));

const { getSession, requireSession } = await import('./current-session');

const session: Session = {
	sessionId: '0198c1d2-8f00-7000-8000-000000000004',
	token: 'secret-token-value',
	absoluteExpiresAt: '2026-06-01T12:00:00Z',
	idleExpiresAt: '2026-06-01T11:00:00Z'
};

/** An event whose `url` throws the way Kit's does inside a remote `query`. */
function remoteQueryEvent(locals: { session?: Session }) {
	const event = fakeRequestEvent();
	Object.defineProperty(event, 'url', {
		get() {
			throw new Error('Cannot read url in a query');
		}
	});
	Object.assign(event.locals, locals);
	return event;
}

describe('getSession', () => {
	it('returns the session of the current request', () => {
		current.event = remoteQueryEvent({ session });

		expect(getSession()).toBe(session);
	});

	it('returns undefined for an anonymous request', () => {
		current.event = remoteQueryEvent({});

		expect(getSession()).toBeUndefined();
	});
});

describe('requireSession', () => {
	it('returns the session of the current request', () => {
		current.event = remoteQueryEvent({ session });

		expect(requireSession()).toBe(session);
	});

	it('redirects an anonymous request with a 303 to the bare /sign-in, without reading the url', () => {
		current.event = remoteQueryEvent({});

		expect(() => requireSession()).toThrow(
			expect.objectContaining({ status: 303, location: '/sign-in' })
		);
	});
});
