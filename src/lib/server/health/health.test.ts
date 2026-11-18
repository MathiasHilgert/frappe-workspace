import { describe, expect, it } from 'vitest';
import { FakeSessionStore } from '../../../../tests/setup/fake-session-store';
import { liveResponse, readyResponse } from './health';

async function describeResponse(response: Response) {
	return {
		status: response.status,
		body: await response.text(),
		cache: response.headers.get('cache-control'),
		setCookie: response.headers.get('set-cookie')
	};
}

describe('liveResponse', () => {
	it('answers 200 with a static body, uncached', async () => {
		expect(await describeResponse(liveResponse())).toStrictEqual({
			status: 200,
			body: '{"status":"ok"}',
			cache: 'no-store',
			setCookie: null
		});
	});
});

describe('readyResponse', () => {
	it('answers 200 when Valkey answers the ping', async () => {
		const store = new FakeSessionStore();

		const response = await readyResponse(store);

		expect(await describeResponse(response)).toStrictEqual({
			status: 200,
			body: '{"status":"ok"}',
			cache: 'no-store',
			setCookie: null
		});
		expect(store.calls).toStrictEqual([{ operation: 'ping' }]);
	});

	it('answers 503 with a static body, no error detail, when the ping fails', async () => {
		const store = new FakeSessionStore();
		store.failing = true;

		const response = await readyResponse(store);

		expect(await describeResponse(response)).toStrictEqual({
			status: 503,
			body: '{"status":"unavailable"}',
			cache: 'no-store',
			setCookie: null
		});
	});
});
