import type { RequestEvent } from '@sveltejs/kit';

/** What a hook test may set on the fake event; everything else gets an inert default. */
export type FakeRequestEventInit = {
	readonly url?: string;
	readonly method?: string;
	readonly headers?: Record<string, string>;
	readonly routeId?: RequestEvent['route']['id'];
};

const refuse = (what: string) => (): never => {
	throw new Error(`The fake request event does not support ${what}.`);
};

/**
 * A complete `RequestEvent` for unit-testing hooks without a server. Members a hook should not
 * touch in a unit test (cookie writes, client address, `setHeaders`) throw when called.
 */
export function fakeRequestEvent(init: FakeRequestEventInit = {}): RequestEvent {
	const url = new URL(init.url ?? 'http://localhost/');
	const request = new Request(url, {
		method: init.method ?? 'GET',
		headers: init.headers ?? {}
	});
	const span = {
		spanContext: () => ({ traceId: '', spanId: '', traceFlags: 0 })
	};

	return {
		cookies: {
			get: () => undefined,
			getAll: () => [],
			set: refuse('cookies.set'),
			delete: refuse('cookies.delete'),
			parse: refuse('cookies.parse'),
			serialize: refuse('cookies.serialize')
		},
		// Unit tests go through MSW, which fails any request the test did not declare (TEST-06).
		fetch: globalThis.fetch,
		getClientAddress: refuse('getClientAddress'),
		locals: {},
		params: {},
		platform: undefined,
		request,
		route: { id: init.routeId ?? null },
		setHeaders: refuse('setHeaders'),
		url,
		isDataRequest: false,
		isSubRequest: false,
		isRemoteRequest: false,
		tracing: { enabled: false, root: span, current: span }
	};
}
