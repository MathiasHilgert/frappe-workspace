import { describe, expect, it } from 'vitest';
import { sessionVariables } from './session.env';

const { SESSION_COOKIE_NAME, VALKEY_URL, VALKEY_COMMAND_TIMEOUT_MS } = sessionVariables;

describe('SESSION_COOKIE_NAME', () => {
	it('defaults to the __Host- production name when unset', () => {
		expect(SESSION_COOKIE_NAME.schema.parse(undefined)).toBe('__Host-workspace-sid');
	});

	it('rejects a name without the __Host- prefix', () => {
		const result = SESSION_COOKIE_NAME.schema.safeParse('workspace-sid');

		expect(result.error?.issues).toMatchObject([{ message: 'Must start with __Host- (SEC-01).' }]);
	});
});

describe('VALKEY_URL', () => {
	it('is required, with no default', () => {
		expect(VALKEY_URL.schema.safeParse(undefined).success).toBe(false);
	});

	it('rejects a URL that is not a Redis or Valkey one', () => {
		expect(VALKEY_URL.schema.safeParse('http://valkey:6379').success).toBe(false);
	});
});

describe('VALKEY_URL schemes', () => {
	it.each(['redis://valkey:6379/0', 'rediss://valkey:6380/0'])('accepts %s', (url) => {
		expect(VALKEY_URL.schema.safeParse(url).success).toBe(true);
	});

	it.each(['valkey://valkey:6379/0', 'valkeys://valkey:6380/0'])(
		'rejects %s, which ioredis would open in plain text',
		(url) => {
			expect(VALKEY_URL.schema.safeParse(url).success).toBe(false);
		}
	);
});

describe('VALKEY_COMMAND_TIMEOUT_MS', () => {
	it('defaults to 250 when unset', () => {
		expect(VALKEY_COMMAND_TIMEOUT_MS.schema.parse(undefined)).toBe(250);
	});

	it.each(['50', '250'])('accepts the bound %s', (value) => {
		expect(VALKEY_COMMAND_TIMEOUT_MS.schema.parse(value)).toBe(Number(value));
	});

	it.each(['49', '251', '100.5', 'fast'])('rejects %s', (value) => {
		expect(VALKEY_COMMAND_TIMEOUT_MS.schema.safeParse(value).success).toBe(false);
	});
});
