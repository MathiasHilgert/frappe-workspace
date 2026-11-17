import { readdirSync } from 'node:fs';

/** Areas outside `src/lib/features` that a commit may be scoped to (CRAFT-03). */
const AREAS = [
	'shared',
	'ui',
	'kernel',
	'server',
	'routes',
	'i18n',
	'config',
	'contracts',
	'observability',
	'tests',
	'tooling',
	'deps',
	'ci',
	'docs',
	'conventions',
	// release-please titles its pull request `chore(release): release <version>`.
	'release'
];

/** Each feature folder is a scope, so a new feature needs no config change. */
const features = () => {
	try {
		return readdirSync('src/lib/features', { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name);
	} catch {
		return [];
	}
};

/** @type {import('@commitlint/types').UserConfig} */
export default {
	extends: ['@commitlint/config-conventional'],
	rules: {
		'scope-enum': () => [2, 'always', [...features(), ...AREAS]]
	}
};
