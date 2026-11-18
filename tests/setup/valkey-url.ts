import { inject } from 'vitest';

/**
 * The URL of this worker's own database of the shared Valkey container: the index is the
 * worker's `VITEST_POOL_ID`, so parallel workers never see each other's keys (S14).
 */
export function workerValkeyUrl(): string {
	const index = process.env.VITEST_POOL_ID ?? '1';
	return `${inject('valkeyUrl')}/${index}`;
}
