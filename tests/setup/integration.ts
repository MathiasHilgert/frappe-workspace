import { faker } from '@faker-js/faker';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { server } from '../msw/server';

// TEST-01, TEST-06: frappe-api is MSW and unhandled requests fail; sockets stay open for the
// Valkey testcontainer.
beforeAll(() => {
	server.listen({ onUnhandledFrame: 'error' });
});

beforeEach(() => {
	faker.seed(1);
});

afterEach(() => {
	server.resetHandlers();
});

afterAll(() => {
	server.close();
});
