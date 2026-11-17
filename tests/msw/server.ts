import { setupServer } from 'msw/node';

/**
 * The MSW server shared by the `server` and `integration` Vitest projects (TEST-06). It starts
 * with no handlers: each test declares the frappe-api responses it needs with `server.use(...)`.
 */
export const server = setupServer();
