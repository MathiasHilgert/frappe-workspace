import { describe, expect, it } from 'vitest';
import { verifyStartupConfig } from './startup';

describe('verifyStartupConfig', () => {
	it('lets the start continue when the frappe-api budget fits', () => {
		const start = () => {
			verifyStartupConfig({ attemptMs: 3_000, totalMs: 8_000 });
		};

		expect(start).not.toThrow();
	});

	it('stops the start, naming the variables, when the total cannot fit the retry', () => {
		const start = () => {
			verifyStartupConfig({ attemptMs: 3_000, totalMs: 4_000 });
		};

		expect(start).toThrow(/Invalid configuration:\nFRAPPE_API_TOTAL_TIMEOUT_MS \(4000\)/);
	});
});
