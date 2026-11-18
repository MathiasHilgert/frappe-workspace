import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { enhancedImages } from '@sveltejs/enhanced-img';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-bun';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		enhancedImages(),
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
				// CRIT-02: Svelte async, only under `<svelte:boundary>` (UI-01).
				experimental: { async: true }
			},
			// CRIT-02: remote functions, only in `*.remote.ts`. No other experimental key.
			experimental: { remoteFunctions: true },
			// OPS-03: `tracing: { server: true }` waits for the OTel SDK. Kit then imports
			// `@opentelemetry/api`, and without it every traced request fails (`tracing_api_missing`).
			// SEC-04: Kit adds nonces (dynamic pages) or hashes (prerendered) to script-src and style-src.
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'style-src': ['self'],
					// Inline `style=""` from app.html, bits-ui positioning and Svelte `style:`.
					'style-src-attr': ['unsafe-inline'],
					// @tailwindcss/forms draws its controls with data: SVG backgrounds.
					'img-src': ['self', 'data:'],
					'font-src': ['self'],
					'connect-src': ['self'],
					'form-action': ['self'],
					'frame-ancestors': ['none'],
					'object-src': ['none'],
					'base-uri': ['none']
				}
			},
			adapter: adapter()
		}),

		paraglideVitePlugin({
			project: './i18n/project.inlang',
			outdir: './src/lib/paraglide',
			emitTsDeclarations: true
		})
	],
	test: {
		expect: { requireAssertions: true },
		passWithNoTests: true,
		// TEST-01: the file suffix decides the project.
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.test.ts'],
					exclude: ['src/lib/server/**']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.test.ts', 'tests/setup/**/*.test.ts'],
					exclude: ['src/**/*.svelte.test.ts', 'src/**/*.integration.test.ts'],
					setupFiles: ['./tests/setup/server.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'integration',
					environment: 'node',
					include: ['src/**/*.integration.test.ts'],
					// TEST-01: one Valkey container per run; each worker takes its own database.
					globalSetup: ['./tests/setup/valkey.ts'],
					setupFiles: ['./tests/setup/integration.ts']
				}
			}
		]
	}
});
