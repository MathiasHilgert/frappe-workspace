import { once } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';
import { Redis } from 'ioredis';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { workerValkeyUrl } from '../../../../tests/setup/valkey-url';
import { systemClock } from '../clock';
import type { Session } from './session';
import { createSessionStore, sessionKey } from './session-store';

const sid = 'b'.repeat(43);
let client: Redis;

function sessionLasting(hours: number): Session {
	const expiresAt = Temporal.Now.instant().add({ hours }).toString();
	return {
		sessionId: '0198c1d2-8f00-7000-8000-000000000002',
		token: 'secret-token-value',
		absoluteExpiresAt: expiresAt,
		idleExpiresAt: expiresAt
	};
}

function storeOver(redis: Redis) {
	return createSessionStore(redis, systemClock);
}

/** A client built the way `hooks.server.ts` builds it, connected before the first command (no offline queue). */
async function connect(commandTimeoutMs: number): Promise<Redis> {
	const redis = new Redis(workerValkeyUrl(), {
		commandTimeout: commandTimeoutMs,
		maxRetriesPerRequest: 0,
		enableOfflineQueue: false
	});
	await once(redis, 'ready');
	return redis;
}

beforeAll(async () => {
	client = await connect(250);
});

beforeEach(async () => {
	await client.flushdb();
});

afterAll(async () => {
	await client.quit();
});

describe('the Valkey session store', () => {
	it('reads back the session it saved', async () => {
		const store = storeOver(client);
		const session = sessionLasting(1);

		const saved = await store.save(sid, session);
		const read = await store.read(sid);

		expect({ saved, read }).toStrictEqual({
			saved: { ok: true, value: undefined },
			read: { ok: true, value: session }
		});
	});

	it('writes one key named by the hash of the sid, expiring at absoluteExpiresAt', async () => {
		const session = sessionLasting(2);

		await storeOver(client).save(sid, session);

		const keys = await client.keys('*');
		expect({
			keys,
			expiresAtMs: await client.pexpiretime(sessionKey(sid))
		}).toStrictEqual({
			keys: [sessionKey(sid)],
			expiresAtMs: Temporal.Instant.from(session.absoluteExpiresAt).epochMilliseconds
		});
		expect(keys.join('')).not.toContain(sid);
	});

	it('has no session for a sid it never saw', async () => {
		const read = await storeOver(client).read(sid);

		expect(read).toStrictEqual({ ok: true, value: undefined });
	});

	it('treats a value that is not JSON as no session and deletes its key', async () => {
		await client.set(sessionKey(sid), 'not json');

		const read = await storeOver(client).read(sid);

		expect({ read, exists: await client.exists(sessionKey(sid)) }).toStrictEqual({
			read: { ok: true, value: undefined },
			exists: 0
		});
	});

	it('treats a value that fails the schema as no session and deletes its key', async () => {
		await client.set(sessionKey(sid), JSON.stringify({ ...sessionLasting(1), sessionId: 'nope' }));

		const read = await storeOver(client).read(sid);

		expect({ read, exists: await client.exists(sessionKey(sid)) }).toStrictEqual({
			read: { ok: true, value: undefined },
			exists: 0
		});
	});

	it('deletes the key of a sid, and deleting a missing key succeeds', async () => {
		const store = storeOver(client);
		await store.save(sid, sessionLasting(1));

		const first = await store.delete(sid);
		const second = await store.delete(sid);

		expect({ first, second, exists: await client.exists(sessionKey(sid)) }).toStrictEqual({
			first: { ok: true, value: undefined },
			second: { ok: true, value: undefined },
			exists: 0
		});
	});

	it('refuses to save an expired session as expired, not unavailable, and writes nothing', async () => {
		const result = await storeOver(client).save(sid, sessionLasting(-1));

		expect({ result, keys: await client.keys('*') }).toStrictEqual({
			result: { ok: false, errors: [{ kind: 'ruleViolation', code: 'workspace.session.expired' }] },
			keys: []
		});
	});

	it('answers ping while Valkey is up', async () => {
		const result = await storeOver(client).ping();

		expect(result).toStrictEqual({ ok: true, value: undefined });
	});

	it('fails as unavailable, without retrying, when Valkey does not answer within the timeout', async () => {
		const slow = await connect(50);
		await client.call('CLIENT', 'PAUSE', '200', 'ALL');

		const started = performance.now();
		const result = await storeOver(slow).read(sid);
		const elapsed = performance.now() - started;
		slow.disconnect();
		// The pause pauses every client, this test's `client` included: let it end.
		await sleep(150);

		expect(result).toMatchObject({
			ok: false,
			errors: [
				{
					kind: 'unavailable',
					code: 'workspace.session.unavailable',
					params: { operation: 'read' }
				}
			]
		});
		expect(elapsed).toBeLessThan(150);
	});

	it('fails as unavailable when the connection is down', async () => {
		const down = new Redis('redis://127.0.0.1:1/0', {
			commandTimeout: 50,
			maxRetriesPerRequest: 0,
			enableOfflineQueue: false,
			retryStrategy: () => null
		});
		down.on('error', () => undefined);

		const result = await storeOver(down).read(sid);
		down.disconnect();

		expect(result).toMatchObject({
			ok: false,
			errors: [{ kind: 'unavailable', params: { operation: 'read' } }]
		});
	});
});
