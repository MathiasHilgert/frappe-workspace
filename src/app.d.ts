import type { Session } from '#lib/server/session/session.js';
import type { SessionStore } from '#lib/server/session/session-store.js';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// RMT-03, SEC-05: `code` selects the UI text, `message` is already safe to show, and
		// `traceId` is set by `handleError` for unexpected errors only.
		interface Error {
			code: string;
			message: string;
			traceId?: string;
		}
		// ARCH-04, S13: `session` is set by `handleSession`; `app` by `handleComposition`, which gives
		// routes the ping of the store and never `save` or `delete`.
		interface Locals {
			session?: Session;
			app: { sessionStore: Pick<SessionStore, 'ping'> };
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
