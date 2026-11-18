import type { SessionStore } from '../session/session-store';

const noStore = { 'Cache-Control': 'no-store' } as const;

/** Liveness (S10): the process runs. It calls nothing and reads no session. */
export function liveResponse(): Response {
	return Response.json({ status: 'ok' }, { headers: noStore });
}

/**
 * Readiness (S10, SEC-03): ready while Valkey answers `PING` within the command timeout. The
 * body is static: an error message, host or port never leaves the server.
 */
export async function readyResponse(store: Pick<SessionStore, 'ping'>): Promise<Response> {
	const pong = await store.ping();
	return pong.ok
		? Response.json({ status: 'ok' }, { headers: noStore })
		: Response.json({ status: 'unavailable' }, { status: 503, headers: noStore });
}
