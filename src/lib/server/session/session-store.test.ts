import { describe, expect, it } from 'vitest';
import type { Clock } from '../clock';
import type { Session } from './session';
import { createSessionStore, type SessionStoreClient } from './session-store';

const sid = 'a'.repeat(43);
const now = Temporal.Instant.from('2026-06-01T10:00:00Z');
const clock: Clock = { now: () => now };

function sessionExpiring(absoluteExpiresAt: string): Session {
	return {
		sessionId: '0198c1d2-8f00-7000-8000-000000000001',
		token: 'secret-token-value',
		absoluteExpiresAt,
		idleExpiresAt: absoluteExpiresAt
	};
}

/** A client whose every call rejects with `error`, like ioredis does for its own errors. */
function failingClient(error: unknown): SessionStoreClient {
	const reject = (): Promise<never> => Promise.reject(error instanceof Error ? error : new Error());
	return { get: reject, set: reject, del: reject, ping: reject };
}

/** What ioredis attaches to a failed command: the arguments, sid and token included. */
function ioredisError(message: string, code?: string): Error {
	return Object.assign(new Error(message), {
		name: 'MaxRetriesPerRequestError',
		...(code === undefined ? {} : { code }),
		command: { name: 'set', args: [`workspace:session:${sid}`, 'secret-token-value'] }
	});
}

/** An in-memory client holding `raw` under whatever key is read; records deleted keys. */
function clientHolding(raw: string): SessionStoreClient & { deleted: string[] } {
	const deleted: string[] = [];
	return {
		deleted,
		get: () => Promise.resolve(raw),
		set: () => Promise.resolve('OK'),
		del: (key) => {
			deleted.push(key);
			return Promise.resolve(1);
		},
		ping: () => Promise.resolve('PONG')
	};
}

describe('createSessionStore stored values Temporal cannot parse', () => {
	it.each(['2026-01-01T00:00:00.1234567890Z', '2026-01-01T00:00Z'])(
		'reads %s as no session and deletes its key',
		async (instant) => {
			const stored = JSON.stringify(sessionExpiring(instant));
			const client = clientHolding(stored);
			const store = createSessionStore(client, clock);

			const result = await store.read(sid);

			expect({ result, deleted: client.deleted.length }).toStrictEqual({
				result: { ok: true, value: undefined },
				deleted: 1
			});
		}
	);

	it('fails to save such a session as a typed failure without calling Valkey', async () => {
		const store = createSessionStore(failingClient(new Error('must not be called')), clock);

		const result = await store.save(sid, sessionExpiring('2026-06-02T00:00:00.1234567890Z'));

		expect(result).toStrictEqual({
			ok: false,
			errors: [{ kind: 'invalidValue', code: 'workspace.session.invalid' }]
		});
	});
});

describe('createSessionStore failures', () => {
	it.each(['read', 'save', 'delete', 'ping'] as const)(
		'maps a failed %s to an unavailable failure carrying only the operation, error name and code',
		async (operation) => {
			const store = createSessionStore(failingClient(ioredisError('boom', 'ECONNREFUSED')), clock);
			const session = sessionExpiring('2026-06-01T11:00:00Z');
			const calls = {
				read: () => store.read(sid),
				save: () => store.save(sid, session),
				delete: () => store.delete(sid),
				ping: () => store.ping()
			};

			const result = await calls[operation]();

			expect(result).toStrictEqual({
				ok: false,
				errors: [
					{
						kind: 'unavailable',
						code: 'workspace.session.unavailable',
						params: { operation, errorName: 'MaxRetriesPerRequestError', errorCode: 'ECONNREFUSED' }
					}
				]
			});
		}
	);

	it('keeps neither the sid nor the token of the failed command', async () => {
		const store = createSessionStore(
			failingClient(ioredisError('boom with secret-token-value')),
			clock
		);

		const result = await store.save(sid, sessionExpiring('2026-06-01T11:00:00Z'));

		const printed = JSON.stringify(result);
		expect({
			sid: printed.includes(sid),
			token: printed.includes('secret-token-value')
		}).toStrictEqual({ sid: false, token: false });
	});

	it('omits the error code when the client error has none', async () => {
		const store = createSessionStore(failingClient(ioredisError('boom')), clock);

		const result = await store.ping();

		expect(result).toMatchObject({
			errors: [{ params: { operation: 'ping', errorName: 'MaxRetriesPerRequestError' } }]
		});
		expect(JSON.stringify(result)).not.toContain('errorCode');
	});

	it('refuses to save a session that expired already, without calling Valkey', async () => {
		const store = createSessionStore(failingClient(new Error('must not be called')), clock);

		const result = await store.save(sid, sessionExpiring('2026-06-01T10:00:00Z'));

		expect(result).toStrictEqual({
			ok: false,
			errors: [{ kind: 'ruleViolation', code: 'workspace.session.expired' }]
		});
	});
});
