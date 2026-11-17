import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import jsdoc from 'eslint-plugin-jsdoc';
import betterTailwindcss from 'eslint-plugin-better-tailwindcss';
import vitest from '@vitest/eslint-plugin';
import playwright from 'eslint-plugin-playwright';
import * as regexpPlugin from 'eslint-plugin-regexp';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

/** TypeScript sources that get type-aware linting (TS-01). `.svelte.ts` is covered by `*.ts`. */
const TYPED_SOURCES = ['**/*.ts', '**/*.svelte'];

/** shadcn-svelte components are vendored and updated with its CLI; refactoring them would be overwritten (DSY-01). */
const VENDORED = ['src/lib/shared/ui/primitives/**', 'src/lib/components/ui/**'];

/** TEST-01: unit, component and integration tests plus their setup; Playwright specs are linted apart. */
const VITEST_FILES = ['src/**/*.test.ts', 'tests/msw/**', 'tests/support/**', 'tests/setup/**'];
const E2E_FILES = ['tests/e2e/**'];

/** `no-restricted-imports` options replace each other per file, so every scoped block spreads these. */
const ENV_IMPORTS = [
	{
		group: ['$env/*'],
		message:
			'OPS-01: `$env/*` is deprecated; read configuration from `src/env.ts` (`$app/env/private`).'
	}
];
const FEATURE_IMPORTS = [
	{
		group: [
			'#lib/shared/ui/primitives',
			'#lib/shared/ui/primitives/**',
			'**/shared/ui/primitives/**'
		],
		message:
			'DSY-01: features import the design system from `#lib/shared/ui`, never its primitives.'
	},
	{
		group: ['bits-ui', 'bits-ui/*'],
		message: 'DSY-01: features import the design system from `#lib/shared/ui`, never bits-ui.'
	}
];
const DOMAIN_IMPORTS = [
	{
		group: ['$app/*', 'svelte', 'svelte/*', 'bun', 'node:*', '#lib/server/*', '**/server/*'],
		message:
			'ARCH-03: `domain/` is pure isomorphic TypeScript; it imports only zod and `shared/kernel`.'
	}
];

/** TS-03: closed sets are string-literal unions. */
const NO_ENUM = {
	selector: 'TSEnumDeclaration',
	message: 'TS-03: use a string-literal union, not an enum.'
};

/** TEST-04: fake timers name what they fake. */
const FAKE_TIMERS = 'CallExpression[callee.property.name="useFakeTimers"]';
const NO_BARE_FAKE_TIMERS = [
	{
		selector: `${FAKE_TIMERS}[arguments.length=0]`,
		message: 'TEST-04: name what to fake, `vi.useFakeTimers({ toFake: [...] })`.'
	},
	{
		selector: `${FAKE_TIMERS}[arguments.0.type="ObjectExpression"]:not(:has(Property[key.name="toFake"]))`,
		message: 'TEST-04: name what to fake, `vi.useFakeTimers({ toFake: [...] })`.'
	}
];

/** TEST-07: locator texts come from the paraglide catalog (`m.*()`), never a string literal. */
const BY_TEXT = 'CallExpression[callee.property.name=/^(getByRole|getByLabel|getByText)$/]';
const NO_LITERAL_LOCATOR_TEXT = [
	{
		selector: `${BY_TEXT} > ObjectExpression > Property[key.name="name"][value.type="Literal"]`,
		message: 'TEST-07: locator names come from the paraglide catalog, `{ name: m.sign_in() }`.'
	},
	{
		selector: `CallExpression[callee.property.name=/^(getByLabel|getByText)$/] > Literal.arguments:first-child`,
		message: 'TEST-07: locator texts come from the paraglide catalog, `getByText(m.sign_in())`.'
	}
];

/** DSY-02: utilities resolve to theme tokens. Patterns match one class, variants included. */
const PALETTE =
	'slate|gray|zinc|neutral|stone|taupe|mauve|mist|olive|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const COLOR_UTILITIES =
	'bg|text|border(?:-[xytrblse])?|ring(?:-offset)?|inset-ring|outline|decoration|divide|fill|stroke|accent|caret|shadow|inset-shadow|drop-shadow|placeholder|from|via|to';
const RESTRICTED_CLASSES = [
	{
		// First, so a `dark:` class is reported for `dark:` rather than for the color it sets.
		pattern: String.raw`(?:^|:)dark:`,
		message: 'DSY-02: no `dark:`; theme tokens already switch with the theme.'
	},
	{
		// The last segment (after every variant) holds an arbitrary value or a CSS-variable shorthand.
		// Arbitrary variants such as `data-[state=open]:` or `[&>svg]:` are selectors, not values, and stay allowed.
		pattern: String.raw`(?:^|:)!?-?[a-z0-9./-]*(?:\[[^\]]*\]|\([^)]*\))[^:]*$`,
		message: 'DSY-02: no arbitrary values; add a token in src/routes/layout.css or a tv() variant.'
	},
	{
		pattern: String.raw`(?:^|:)!?(?:${COLOR_UTILITIES})-(?:(?:${PALETTE})-\d{2,3}|black|white)(?:\/\S+)?!?$`,
		message:
			'DSY-02: no raw palette colors; use a theme token such as bg-card or text-muted-foreground.'
	}
];

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	{ ignores: ['src/lib/paraglide/**'] },
	js.configs.recommended,
	ts.configs.recommended,
	// TS-01: strictTypeChecked + stylisticTypeChecked on TypeScript and Svelte, never on vendored primitives.
	{
		files: TYPED_SOURCES,
		ignores: VENDORED,
		extends: [ts.configs.strictTypeChecked, ts.configs.stylisticTypeChecked]
	},
	svelte.configs.recommended,
	// Subtle errors in regular expressions, on every linted source.
	regexpPlugin.configs['flat/recommended'],
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off',
			'no-restricted-imports': ['error', { patterns: ENV_IMPORTS }]
		}
	},
	{
		files: TYPED_SOURCES,
		languageOptions: {
			parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname }
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{
		// TS-01..TS-03 on top of the presets.
		files: TYPED_SOURCES,
		ignores: VENDORED,
		rules: {
			// TS-03: `interface` for ports, `type` for data.
			'@typescript-eslint/consistent-type-definitions': 'off',
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-non-null-assertion': 'error',
			// TS-02: no `as` (`as const` stays allowed); the escape is a commented, TS-02-citing disable.
			'@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
			'@typescript-eslint/switch-exhaustiveness-check': 'error',
			'@typescript-eslint/no-floating-promises': 'error',
			'no-restricted-syntax': ['error', NO_ENUM]
		}
	},
	{
		// OPS-01: configuration comes from src/env.ts, never process.env.
		files: ['src/**'],
		ignores: ['src/env.ts'],
		rules: {
			'no-restricted-properties': [
				'error',
				{
					object: 'process',
					property: 'env',
					message: 'OPS-01: read configuration from `src/env.ts`.'
				}
			]
		}
	},
	{
		// DSY-01 and ARCH-03 as editor hints; dependency-cruiser (`bun run arch`) is the gate.
		files: ['src/lib/features/**'],
		rules: {
			'no-restricted-imports': ['error', { patterns: [...ENV_IMPORTS, ...FEATURE_IMPORTS] }]
		}
	},
	{
		files: ['src/lib/features/*/domain/**'],
		ignores: ['**/*.test.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{ patterns: [...ENV_IMPORTS, ...FEATURE_IMPORTS, ...DOMAIN_IMPORTS] }
			]
		}
	},
	{
		// TS-04: logic reads time as Temporal from the injected Clock.
		files: ['src/lib/features/*/domain/**', 'src/lib/features/*/server/**', 'src/lib/server/**'],
		rules: {
			'no-restricted-globals': [
				'error',
				{ name: 'Date', message: 'TS-04: read time from the injected Clock as Temporal.' }
			]
		}
	},
	{
		// CRAFT-02: the public surface has TSDoc saying what and why.
		files: ['src/lib/features/*/index.ts', 'src/lib/shared/**/*.ts'],
		ignores: [...VENDORED, '**/*.test.ts'],
		plugins: { jsdoc },
		rules: {
			'jsdoc/require-jsdoc': [
				'error',
				{
					publicOnly: true,
					// Exported arrow functions are covered by the VariableDeclaration context.
					require: { ClassDeclaration: true, FunctionDeclaration: true },
					contexts: [
						'TSInterfaceDeclaration',
						'TSTypeAliasDeclaration',
						'ExportNamedDeclaration > VariableDeclaration'
					]
				}
			],
			'jsdoc/require-description': 'error',
			'jsdoc/informative-docs': 'error'
		}
	},
	{
		// DSY-02: classes must exist in the theme (src/routes/layout.css).
		files: ['**/*.svelte', '**/*.ts'],
		ignores: VENDORED,
		plugins: { 'better-tailwindcss': betterTailwindcss },
		settings: { 'better-tailwindcss': { entryPoint: 'src/routes/layout.css' } },
		rules: {
			'better-tailwindcss/no-unknown-classes': 'error'
		}
	},
	{
		// DSY-02: outside the design system, tokens and variants only.
		files: ['**/*.svelte', '**/*.ts'],
		ignores: ['src/lib/shared/ui/**', ...VENDORED],
		rules: {
			'better-tailwindcss/no-restricted-classes': ['error', { restrict: RESTRICTED_CLASSES }]
		}
	},
	{
		// CRAFT-01: complexity budget, the same as frappe-api: cognitive <= 15 and cyclomatic <= 10 per function.
		plugins: { sonarjs },
		rules: {
			complexity: ['error', 10],
			'sonarjs/cognitive-complexity': ['error', 15]
		}
	},
	{
		files: VENDORED,
		rules: {
			complexity: 'off',
			'sonarjs/cognitive-complexity': 'off'
		}
	},
	{
		// TEST-01/TEST-03: Vitest rules on unit, component and integration tests.
		// `vitest/expect-expect` is off: `expect.requireAssertions` (vite.config.ts) already fails a test without
		// assertions at runtime, and the static rule cannot see assertions inside shared helpers.
		files: VITEST_FILES,
		plugins: { vitest },
		// TEST-04: `no-restricted-syntax` replaces the TYPED_SOURCES options, so TS-03 is repeated here.
		rules: {
			...vitest.configs.recommended.rules,
			'vitest/expect-expect': 'off',
			'vitest/no-conditional-in-test': 'error',
			'no-restricted-syntax': ['error', NO_ENUM, ...NO_BARE_FAKE_TIMERS]
		}
	},
	{
		// TEST-07: Playwright rules on e2e specs; the rules that guard waiting by assertion are errors.
		files: E2E_FILES,
		...playwright.configs['flat/recommended'],
		rules: {
			...playwright.configs['flat/recommended'].rules,
			'playwright/missing-playwright-await': 'error',
			'playwright/no-focused-test': 'error',
			'playwright/no-wait-for-timeout': 'error',
			'playwright/no-networkidle': 'error',
			'playwright/prefer-web-first-assertions': 'error',
			'playwright/no-raw-locators': 'error',
			'playwright/no-get-by-title': 'error',
			// TS-03 repeated: `no-restricted-syntax` options replace each other per file.
			'no-restricted-syntax': ['error', NO_ENUM, ...NO_BARE_FAKE_TIMERS, ...NO_LITERAL_LOCATOR_TEXT]
		}
	},
	{
		// Subtle Svelte errors: a script without `lang="ts"` escapes TS-01, a button without `type` submits forms,
		// and `target="_blank"` without `rel` leaks `window.opener`.
		// Vendored primitives are included on purpose: they pass today, the rules flag defects (not style), and a
		// shadcn update that regressed one should fail here rather than ship.
		files: ['**/*.svelte'],
		rules: {
			'svelte/block-lang': ['error', { script: 'ts', style: null }],
			'svelte/button-has-type': 'error',
			'svelte/no-target-blank': 'error'
		}
	}
);
