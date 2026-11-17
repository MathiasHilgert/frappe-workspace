import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

export default defineConfig({
	// TEST-01: e2e lives in tests/e2e (testDir is relative to this file) and covers only critical flows.
	testDir: 'e2e',
	use: {
		// TEST-07: locator texts come from the paraglide catalog of this locale.
		locale: 'en',
		trace: 'on-first-retry'
	},
	webServer: {
		command: 'bun run build && bun run preview',
		port: 4173,
		// This file lives in tests/; the build and preview run from the repository root.
		cwd: fileURLToPath(new URL('..', import.meta.url)),
		// Placeholders for the variables `src/env.ts` requires until e2e runs against the real
		// frappe-api slot (TEST-01); the shell environment wins when set.
		env: {
			FRAPPE_API_BASE_URL: process.env.FRAPPE_API_BASE_URL ?? 'http://localhost:8080',
			VALKEY_URL: process.env.VALKEY_URL ?? 'redis://localhost:6380/0'
		}
	}
});
