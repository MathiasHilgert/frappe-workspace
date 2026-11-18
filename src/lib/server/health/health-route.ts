const healthRoutes: ReadonlySet<string> = new Set(['/health/live', '/health/ready']);

/** Whether a `route.id` is one of the two health probes (S8): exact ids, nothing under or beside them. */
export function isHealthRoute(routeId: string | null): boolean {
	return routeId !== null && healthRoutes.has(routeId);
}
