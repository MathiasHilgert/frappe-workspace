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
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
