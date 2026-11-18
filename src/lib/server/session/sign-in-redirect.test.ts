import { describe, expect, it } from 'vitest';
import { safeNext, signInLocation } from './sign-in-redirect';

describe('safeNext', () => {
	it.each([
		['//x', 'a protocol-relative URL'],
		['/\\x', 'a backslash after the slash'],
		['/\t/x', 'a tab'],
		['/\n/x', 'a newline'],
		['/a\u0000b', 'a NUL'],
		['/a\u007Fb', 'DEL'],
		['/a\\b', 'any backslash'],
		[' //x', 'a leading space'],
		['https://x', 'an absolute URL'],
		['//u@x', 'userinfo after a double slash'],
		['', 'an empty value'],
		['x', 'a relative path'],
		[`/${'a'.repeat(2048)}`, 'more than 2048 characters']
	])('drops %j (%s)', (raw) => {
		expect(safeNext(raw)).toBeUndefined();
	});

	it('keeps an encoded slash pair as a path', () => {
		expect(safeNext('/%2F%2Fx')).toBe('/%2F%2Fx');
	});

	it('keeps an encoded backslash as a path, since it is not a backslash yet', () => {
		expect(safeNext('/%5Cx')).toBe('/%5Cx');
	});

	it('returns the path and the query', () => {
		expect(safeNext('/workspaces/1?tab=files')).toBe('/workspaces/1?tab=files');
	});

	it('accepts exactly 2048 characters', () => {
		const raw = `/${'a'.repeat(2047)}`;

		expect(safeNext(raw)).toBe(raw);
	});

	it.each(['/.//x', '/..//x', '/a/..//x'])(
		'drops %j, whose dot segments would normalize to a protocol-relative URL',
		(raw) => {
			expect(safeNext(raw)).toBeUndefined();
		}
	);
});

describe('signInLocation', () => {
	it('is the bare sign-in path without a target', () => {
		expect(signInLocation()).toBe('/sign-in');
	});

	it('carries the path and query of the target as an encoded next', () => {
		expect(signInLocation(new URL('http://localhost/a/b?x=1&y=2'))).toBe(
			'/sign-in?next=%2Fa%2Fb%3Fx%3D1%26y%3D2'
		);
	});

	it('carries next for the home page', () => {
		expect(signInLocation(new URL('http://localhost/'))).toBe('/sign-in?next=%2F');
	});

	it('drops next when the target is not a safe path', () => {
		expect(signInLocation(new URL('http://localhost//evil.test/x'))).toBe('/sign-in');
	});
});
