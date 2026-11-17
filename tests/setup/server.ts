import { faker } from '@faker-js/faker';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { server } from '../msw/server';

// TEST-06: a unit test cannot reach what it did not declare. MSW answers declared HTTP requests
// and fails any other. Raw sockets are not blocked here: MSW 3 intercepts at
// `net.Socket.prototype.connect` and passes non-HTTP connections through, so a second patch there
// would break its own mocks. Unit tests stay off sockets by importing no `server/**` infrastructure.
beforeAll(() => {
	server.listen({ onUnhandledFrame: 'error' });
});

// TEST-05: generated data reproduces; override every value a test asserts on.
beforeEach(() => {
	faker.seed(1);
});

afterEach(() => {
	server.resetHandlers();
});

afterAll(() => {
	server.close();
});
