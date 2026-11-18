import { describe, expect, it } from 'vitest';
import { FakeCookies } from '../../../../tests/setup/fake-cookies';
import { FakeSessionStore } from '../../../../tests/setup/fake-session-store';
import type { Session } from './session';
import { deleteSessionCookie, endSession, startSession } from './session-cookie';
import { isSid } from './sid';

const cookieName = '__Host-workspace-sid';
const oldSid = 'o'.repeat(43);
const session: Session = {
	sessionId: '0198c1d2-8f00-7000-8000-000000000003',
	token: 'secret-token-value',
	absoluteExpiresAt: '2026-06-01T12:00:00Z',
	idleExpiresAt: '2026-06-01T11:00:00Z'
};

function setup(initial: Record<string, string> = {}) {
	const store = new FakeSessionStore();
	const cookies = new FakeCookies(initial);
	return { store, cookies, deps: { store, cookies, cookieName } };
}

describe('startSession', () => {
	it('stores the session under a new sid and sets the hardened cookie expiring at absoluteExpiresAt', async () => {
		const { store, cookies, deps } = setup();

		const result = await startSession(deps, session);

		const [write] = cookies.writes;
		expect(result).toStrictEqual({ ok: true, value: undefined });
		expect(cookies.writes).toHaveLength(1);
		expect(write).toMatchObject({
			kind: 'set',
			name: cookieName,
			options: {
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'lax'
			}
		});
		expect(write?.kind === 'set' && isSid(write.value)).toBe(true);
		expect(write?.options?.expires?.toISOString()).toBe('2026-06-01T12:00:00.000Z');
		expect(write?.options).not.toHaveProperty('domain');
		expect([...store.sessions.values()]).toStrictEqual([session]);
		expect(write?.kind === 'set' && store.sessions.has(write.value)).toBe(true);
	});

	it('issues a different sid at every login', async () => {
		const first = setup();
		const second = setup();

		await startSession(first.deps, session);
		await startSession(second.deps, session);

		expect([...first.store.sessions.keys()]).not.toStrictEqual([...second.store.sessions.keys()]);
	});

	it('deletes the key of the sid the request carried before saving the new one (fixation)', async () => {
		const { store, cookies, deps } = setup({ [cookieName]: oldSid });
		store.sessions.set(oldSid, session);

		await startSession(deps, session);

		expect(store.calls.map((call) => call.operation)).toStrictEqual(['delete', 'save']);
		expect(store.calls[0]).toStrictEqual({ operation: 'delete', sid: oldSid });
		expect(store.sessions.has(oldSid)).toBe(false);
		expect(cookies.get(cookieName)).not.toBe(oldSid);
	});

	it('does not touch the store for a carried cookie that is not a sid', async () => {
		const { store, deps } = setup({ [cookieName]: 'garbage' });

		await startSession(deps, session);

		expect(store.calls.map((call) => call.operation)).toStrictEqual(['save']);
	});

	it('fails and sets no cookie when the store is unavailable', async () => {
		const { store, cookies, deps } = setup();
		store.failing = true;

		const result = await startSession(deps, session);

		expect(result).toMatchObject({ ok: false, errors: [{ kind: 'unavailable' }] });
		expect(cookies.writes).toStrictEqual([]);
	});
});

describe('endSession', () => {
	it('deletes the key and the cookie, repeating the attributes a browser needs to drop a __Host- cookie', async () => {
		const { store, cookies, deps } = setup({ [cookieName]: oldSid });
		store.sessions.set(oldSid, session);

		const result = await endSession(deps);

		expect(result).toStrictEqual({ ok: true, value: undefined });
		expect(store.sessions.size).toBe(0);
		expect(cookies.writes).toStrictEqual([
			{
				kind: 'delete',
				name: cookieName,
				options: { path: '/', secure: true, httpOnly: true }
			}
		]);
	});

	it('still deletes the cookie when the store is unavailable, and reports the failure', async () => {
		const { store, cookies, deps } = setup({ [cookieName]: oldSid });
		store.failing = true;

		const result = await endSession(deps);

		expect(result).toMatchObject({ ok: false, errors: [{ kind: 'unavailable' }] });
		expect(cookies.writes).toMatchObject([{ kind: 'delete', name: cookieName }]);
	});

	it('only deletes the cookie when the request carried none', async () => {
		const { store, cookies, deps } = setup();

		const result = await endSession(deps);

		expect(result).toStrictEqual({ ok: true, value: undefined });
		expect(store.calls).toStrictEqual([]);
		expect(cookies.writes).toMatchObject([{ kind: 'delete', name: cookieName }]);
	});
});

describe('deleteSessionCookie', () => {
	it('repeats path, secure and httpOnly', () => {
		const cookies = new FakeCookies({ [cookieName]: oldSid });

		deleteSessionCookie(cookies, cookieName);

		expect(cookies.writes).toStrictEqual([
			{ kind: 'delete', name: cookieName, options: { path: '/', secure: true, httpOnly: true } }
		]);
	});
});
