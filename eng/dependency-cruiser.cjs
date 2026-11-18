// ARCH-03 (layers point inward, features meet only through index.ts), DSY-01 (features never touch primitives)
// and CON-01 (generated client code stays in server code). Run with `bun run arch`.
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
	forbidden: [
		{
			name: 'no-circular',
			severity: 'error',
			comment: 'ARCH-03: cycles hide the direction of a dependency.',
			from: {},
			to: { circular: true }
		},
		{
			name: 'domain-is-pure',
			severity: 'error',
			comment: 'ARCH-03: domain/ imports only its own domain, zod and shared/kernel.',
			from: { path: '^src/lib/features/([^/]+)/domain/', pathNot: '[.]test[.]ts$' },
			to: {
				pathNot: [
					'^src/lib/features/$1/domain/',
					'^src/lib/shared/kernel/',
					'(^|/)node_modules/zod/'
				]
			}
		},
		{
			name: 'kernel-is-pure',
			severity: 'error',
			comment: 'ARCH-03: shared/kernel is imported by domain/, so it keeps the same purity.',
			from: { path: '^src/lib/shared/kernel/', pathNot: '[.]test[.]ts$' },
			to: { pathNot: ['^src/lib/shared/kernel/', '(^|/)node_modules/zod/'] }
		},
		{
			name: 'feature-through-index',
			severity: 'error',
			comment: 'ARCH-03: another feature is reached only through #lib/features/<f> (its index.ts).',
			from: { path: '^src/lib/features/([^/]+)/' },
			to: {
				path: '^src/lib/features/',
				pathNot: ['^src/lib/features/$1/', '^src/lib/features/[^/]+/index[.]ts$']
			}
		},
		{
			name: 'outside-through-index',
			severity: 'error',
			comment: 'ARCH-03: code outside features reaches a feature only through its index.ts.',
			from: { path: '^src/', pathNot: '^src/lib/features/' },
			to: { path: '^src/lib/features/', pathNot: '^src/lib/features/[^/]+/index[.]ts$' }
		},
		{
			name: 'shared-never-imports-features',
			severity: 'error',
			comment:
				'ARCH-03: shared/ and src/lib/server/ hold no business rules and never import a feature.',
			from: { path: '^src/lib/(shared|server)/' },
			to: { path: '^src/lib/features/' }
		},
		{
			name: 'presentation-never-imports-server',
			severity: 'error',
			comment:
				'ARCH-03: presentation imports its domain, its .remote.ts and shared/ui, never server code.',
			from: { path: '^src/lib/features/[^/]+/presentation/' },
			to: { path: ['^src/.*/server/', '[.]server[.](ts|js)$'] }
		},
		{
			name: 'server-never-imports-presentation',
			severity: 'error',
			comment: 'ARCH-03: server code (application, gateways) points inward, never at presentation.',
			from: { path: '^src/lib/features/[^/]+/server/' },
			to: { path: ['^src/lib/features/[^/]+/presentation/', '[.]svelte$'] }
		},
		{
			name: 'features-never-import-primitives',
			severity: 'error',
			comment: 'DSY-01: features use the design system only through shared/ui.',
			from: { path: '^src/lib/features/' },
			to: { path: ['^src/lib/shared/ui/primitives/', '(^|/)node_modules/bits-ui/'] }
		},
		{
			name: 'generated-only-under-server',
			severity: 'error',
			comment:
				'CON-01: Orval output lives in a generated/ directory under server/ and only server code imports it.',
			from: {},
			to: { path: '^src/.*generated/', pathNot: '^src/.*/server/.*generated/' }
		},
		{
			name: 'generated-imported-only-by-server',
			severity: 'error',
			comment: 'CON-01: only server code imports the generated client.',
			from: { pathNot: '^src/.*/server/' },
			to: { path: '^src/.*/server/.*generated/' }
		},
		{
			name: 'vendor-clients-confined',
			severity: 'error',
			comment:
				'ARCH-03, DES-02: ioredis is imported only by the session store and hooks.server.ts, not even for a type, so the client can be replaced.',
			from: {
				pathNot: [
					'^src/hooks[.]server[.]ts$',
					'^src/lib/server/session/session-store[.]ts$',
					'[.](spec|test)[.](js|ts)$'
				]
			},
			to: { path: '(^|/)node_modules/ioredis/' }
		},
		{
			name: 'vendor-clients-confined-pino',
			severity: 'error',
			comment:
				'ARCH-03, OPS-03: pino is imported only by logger.ts; a type-only import (`import type { Logger }`) is allowed anywhere.',
			from: { pathNot: ['^src/lib/server/logger[.]ts$', '[.](spec|test)[.](js|ts)$'] },
			to: { path: '(^|/)node_modules/pino/', dependencyTypesNot: ['type-only'] }
		},
		{
			name: 'not-to-spec',
			severity: 'error',
			comment: 'TEST-01: production code never imports a test file or anything under tests/.',
			from: {
				path: '^src/',
				pathNot: ['[.](spec|test)[.](js|ts)$', '^src/.*[.]svelte[.]test[.]ts$']
			},
			to: { path: ['[.](spec|test)[.](js|ts)$', '^tests/'] }
		},
		{
			name: 'no-non-package-json',
			severity: 'error',
			comment:
				'An import of a package that package.json does not declare only works by hoisting accident.',
			from: { pathNot: ['[.](spec|test)[.](js|ts)$'] },
			to: { dependencyTypes: ['npm-no-pkg', 'npm-unknown'] }
		},
		{
			name: 'not-to-unresolvable',
			severity: 'error',
			comment: 'An import that does not resolve is a typo or a missing dependency.',
			from: {},
			to: {
				couldNotResolve: true,
				pathNot: ['^[$]app/', '^[$]env/', '^[$]service-worker$', '^virtual:', '^[.]/[$]types$']
			}
		}
	],
	options: {
		doNotFollow: { path: 'node_modules' },
		exclude: { path: ['^src/lib/paraglide/'] },
		// Type-only imports count: a domain type importing Svelte is still a leak.
		tsPreCompilationDeps: true,
		tsConfig: { fileName: 'tsconfig.json' },
		enhancedResolveOptions: {
			exportsFields: ['exports'],
			conditionNames: ['import', 'require', 'node', 'svelte', 'types', 'default'],
			mainFields: ['module', 'main', 'types', 'typings'],
			extensions: ['.ts', '.js', '.svelte', '.d.ts', '.json']
		},
		reporterOptions: {
			text: { highlightFocused: true }
		}
	}
};
