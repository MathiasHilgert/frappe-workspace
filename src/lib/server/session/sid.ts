const sidShape = /^[\w-]{43}$/u;

/** A new session id: 32 random bytes in base64url (SEC-01), 43 characters. */
export function newSid(): string {
	return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
}

/** Whether `value` has the shape of a sid; a cookie that does not never reaches Valkey (S5). */
export function isSid(value: string): boolean {
	return sidShape.test(value);
}
