import type { Handle } from '@sveltejs/kit/hooks';
import type { SessionStore } from '../session/session-store';

/** The process-wide objects {@link createHandleComposition} hands to requests. */
export type HandleCompositionDeps = { readonly sessionStore: Pick<SessionStore, 'ping'> };

/**
 * Builds `handleComposition` (ARCH-04): fills `event.locals.app` with the per-request deps.
 * Routes get the store's `ping` only; `save` and `delete` stay with the sign-in and logout code.
 */
export function createHandleComposition({ sessionStore }: HandleCompositionDeps): Handle {
	return ({ event, resolve }) => {
		event.locals.app = { sessionStore: { ping: () => sessionStore.ping() } };
		return resolve(event);
	};
}
