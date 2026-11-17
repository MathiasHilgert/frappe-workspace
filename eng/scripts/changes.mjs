// Which checks a pull request's changed files can affect. The workflows ask the "Changes" job (changes.yml), and a
// heavy check whose inputs did not change is skipped through its job's `if:`, which GitHub reports as passing. When in
// doubt, everything runs: on any event other than a pull request, when the file list is incomplete or empty, when the
// CI itself changes, and when a changed file is in no category below. The tests next to this file pin the mapping.

/** Where a changed file can have an effect. A file in no category is unknown, and an unknown file runs everything. */
const CATEGORIES = {
	// The CI itself: a pull request that changes it runs everything, so it proves the CI it changes.
	ci: ['.github/workflows/**', '.github/actions/**', 'eng/scripts/**'],
	// What the application builds and tests from: sources, tests, translations, packages and the tool configs.
	app: [
		'src/**',
		'static/**',
		'i18n/**',
		'tests/**',
		'package.json',
		'bun.lock',
		'tsconfig.json',
		'components.json',
		'vite.config.ts',
		'svelte.config.js',
		'eslint.config.js',
		'prettier.config.js',
		'eng/dependency-cruiser.cjs',
		'eng/knip.jsonc',
		'eng/commitlint.config.js',
		'.config/**',
		'.editorconfig'
	],
	// The image: the Dockerfile and its ignore file, its lint config and the compose stack that runs it.
	container: [
		'deploy/Dockerfile',
		'deploy/Dockerfile.dockerignore',
		'deploy/compose.yaml',
		'eng/hadolint.yaml'
	],
	// Dependency advisories and their documented exceptions.
	audit: ['eng/osv-scanner.toml'],
	// Read by no gated check: only by "Code is formatted", "Code passes the linters", "Spelling is correct" and
	// "Links are valid", which always run, or by no check.
	inert: [
		'**/*.md',
		'LICENSE',
		'eng/markdownlint-cli2.jsonc',
		'eng/typos.toml',
		'.justfile',
		'eng/just/**',
		'deploy/.env.example',
		'.env.example',
		'.gitignore',
		'.gitattributes',
		'.prettierignore',
		'.vscode/**',
		'.github/renovate.json5',
		'.github/labels.json',
		'.github/labeler.yml',
		'.github/rulesets/**',
		'.github/release-please-config.json',
		'.github/release-please-manifest.json',
		'.github/pull_request_template.md'
	]
};

/** Each gated group of checks, and the categories that can affect it (the "ci" category affects every one). */
export const CHECKS = {
	// Unit, component, integration, architecture, end-to-end and coverage · types · dead code · the app build
	app: ['app'],
	// Image builds and starts · Container image is clean · Dockerfile follows best practices
	image: ['app', 'container'],
	// No vulnerable dependencies: the packages, or their exceptions
	audit: ['app', 'audit']
};

const compiled = new Map();

/**
 * Whether a path matches a glob: `**` spans directories (`**` + `/` also matches none), `*` and `?` stay within one.
 * @param {string} glob
 * @param {string} path
 */
export function matches(glob, path) {
	if (!compiled.has(glob)) {
		let source = '';
		for (let i = 0; i < glob.length; i++) {
			const char = glob[i];
			if (glob.startsWith('**/', i)) {
				source += '(?:.*/)?';
				i += 2;
			} else if (glob.startsWith('**', i)) {
				source += '.*';
				i += 1;
			} else if (char === '*') {
				source += '[^/]*';
			} else if (char === '?') {
				source += '[^/]';
			} else {
				source += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
			}
		}
		compiled.set(glob, new RegExp(`^${source}$`));
	}

	return compiled.get(glob).test(path);
}

/**
 * Every gated check runs, for the given reason.
 * @param {string} reason
 */
export function runEverything(reason) {
	return {
		checks: Object.fromEntries(Object.keys(CHECKS).map((check) => [check, true])),
		reason
	};
}

/**
 * Decides which gated checks run for a pull request's changed files.
 * @param {string[]} files every changed path; for a rename, both the new and the previous path
 * @param {{ complete: boolean }} options complete is false when the list may be missing files
 */
export function decide(files, { complete }) {
	if (!complete) {
		return runEverything('the list of changed files is incomplete');
	}

	if (files.length === 0) {
		return runEverything('no changed files were listed');
	}

	const touched = new Set();
	const unknown = [];
	for (const file of files) {
		const categories = Object.keys(CATEGORIES).filter((category) =>
			CATEGORIES[category].some((glob) => matches(glob, file))
		);
		if (categories.length === 0) {
			unknown.push(file);
		}
		categories.forEach((category) => touched.add(category));
	}

	if (touched.has('ci')) {
		return runEverything('the pull request changes the CI');
	}

	if (unknown.length > 0) {
		return runEverything(`files in no category: ${unknown.join(', ')}`);
	}

	const checks = Object.fromEntries(
		Object.entries(CHECKS).map(([check, categories]) => [
			check,
			categories.some((category) => touched.has(category))
		])
	);
	return { checks, reason: `changed categories: ${[...touched].sort().join(', ')}` };
}
