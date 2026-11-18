import { describe, expect, it } from 'vitest';
import { sessionVariables } from './session.env';

const { SESSION_COOKIE_NAME, VALKEY_URL } = sessionVariables;

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
