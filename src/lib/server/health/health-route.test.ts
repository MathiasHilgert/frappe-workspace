import { describe, expect, it } from 'vitest';
import { isHealthRoute } from './health-route';

describe('isHealthRoute', () => {
	it.each(['/health/live', '/health/ready'])('is true for %s', (routeId) => {
		expect(isHealthRoute(routeId)).toBe(true);
	});

	it.each([
		null,
		'/health',
		'/health/',
		'/health/other',
		'/health/live/x',
		'/healthz',
		'/(public)'
	])('is false for %s', (routeId) => {
		expect(isHealthRoute(routeId)).toBe(false);
	});
});
