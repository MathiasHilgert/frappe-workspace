import { faker } from '@faker-js/faker';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../msw/server';

describe('the server project setup', () => {
	it('answers a request a test declared', async () => {
		server.use(http.get('https://api.test/v1/ping', () => HttpResponse.json({ pong: true })));

		const response = await fetch('https://api.test/v1/ping');

		expect(await response.json()).toStrictEqual({ pong: true });
	});

	it('fails a request no test declared', async () => {
		const failure = await fetch('https://api.test/v1/undeclared').catch((error: unknown) => error);

		expect(failure instanceof Error ? String(failure.cause) : '').toContain(
			'[MSW] Cannot bypass a request'
		);
	});

	it('seeds faker before each test so generated data reproduces', () => {
		const first = faker.string.uuid();
		faker.seed(1);

		expect(faker.string.uuid()).toBe(first);
	});
});
