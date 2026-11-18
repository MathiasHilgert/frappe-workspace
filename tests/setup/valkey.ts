import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
	export interface ProvidedContext {
		/** `redis://host:port` of the Valkey container started for this run (TEST-01). */
		valkeyUrl: string;
	}
}

// Same image as deploy/compose.yaml. Many databases, because each worker takes its own index.
const VALKEY_IMAGE =
	'valkey/valkey:8.1.11-alpine@sha256:2602ace2be6569bc2bbb06f873776516ab9089821525be34f4305c67eb9db02a';
const VALKEY_PORT = 6379;

/**
 * Vitest `globalSetup` of the `integration` project: starts one Valkey container, hands its URL
 * to the workers with `project.provide`, and stops it when the run ends.
 */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
	const container: StartedTestContainer = await new GenericContainer(VALKEY_IMAGE)
		.withExposedPorts(VALKEY_PORT)
		.withCommand(['valkey-server', '--databases', '256'])
		.withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/u))
		.start();

	project.provide(
		'valkeyUrl',
		`redis://${container.getHost()}:${String(container.getMappedPort(VALKEY_PORT))}`
	);

	return async () => {
		await container.stop();
	};
}
