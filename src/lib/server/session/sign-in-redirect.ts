const maxLength = 2048;
// Any control character (U+0000-U+001F, U+007F) or backslash: browsers read `\` as `/`, and
// control characters are stripped before a URL is parsed.
const forbidden = /[\u0000-\u001F\u007F\\]/u; // eslint-disable-line no-control-regex -- the point is to reject them
const localPath = /^\/(?![/\\])/u;
const parseBase = 'http://n.invalid';

/**
 * Reduces a value from a query string or a request URL to a local path and query, or
 * `undefined` when it could send the browser to another site (S9). The only function that
 * builds or reads the `next` of the sign-in redirect.
 */
export function safeNext(raw: string): string | undefined {
	if (raw.length > maxLength || forbidden.test(raw) || !localPath.test(raw)) return undefined;

	const parsed = new URL(raw, parseBase);
	if (parsed.origin !== parseBase) return undefined;

	// Dot segments normalize after the shape check: `/.//x` becomes `//x`.
	const local = parsed.pathname + parsed.search;
	return localPath.test(local) ? local : undefined;
}

/**
 * Where an anonymous visitor goes to sign in: the bare path without a target, `?next=` with the
 * path and query of `target` when they are safe. No personal data goes in the URL (SEC-05).
 */
export function signInLocation(target?: URL): string {
	const next = target === undefined ? undefined : safeNext(target.pathname + target.search);
	return next === undefined ? '/sign-in' : `/sign-in?next=${encodeURIComponent(next)}`;
}
