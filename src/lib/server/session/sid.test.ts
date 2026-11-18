import { describe, expect, it } from 'vitest';
import { isSid, newSid } from './sid';

describe('newSid', () => {
	it('is 32 random bytes in base64url, 43 characters', () => {
		expect(newSid()).toMatch(/^[\w-]{43}$/);
	});

	it('is different every time', () => {
		expect(newSid()).not.toBe(newSid());
	});
});

describe('isSid', () => {
	it('accepts a generated sid', () => {
		expect(isSid(newSid())).toBe(true);
	});

	it.each([
		'',
		'short',
		'a'.repeat(42),
		'a'.repeat(44),
		`${'a'.repeat(42)}=`,
		`${'a'.repeat(42)}+`
	])('rejects %j', (value) => {
		expect(isSid(value)).toBe(false);
	});

	it('rejects a trailing newline, which `$` alone would let through', () => {
		expect(isSid(`${'a'.repeat(43)}\n`)).toBe(false);
	});
});
