import type { RequestHandler } from './$types';
import { readyResponse } from '#lib/server/health/health.js';

// ARCH-04: the route only mounts; the probe lives in `src/lib/server/health`.
export const GET: RequestHandler = ({ locals }) => readyResponse(locals.app.sessionStore);
