import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHECKS, decide, matches, runEverything } from './changes.mjs';

const complete = { complete: true };

test('a glob spans directories only with two stars', () => {
	assert.equal(matches('src/**', 'src/lib/a.ts'), true);
	assert.equal(matches('**/*.md', 'README.md'), true);
	assert.equal(matches('**/*.md', 'docs/deep/a.md'), true);
	assert.equal(matches('eng/*.jsonc', 'eng/a/b.jsonc'), false);
	assert.equal(matches('package.json', 'packageXjson'), false);
});

test('a source change runs every check', () => {
	const { checks } = decide(['src/lib/server/config/session.env.ts'], complete);
	assert.deepEqual(checks, { app: true, image: true, audit: true });
});

test('a Dockerfile change runs the image checks only', () => {
	const { checks } = decide(['deploy/Dockerfile'], complete);
	assert.deepEqual(checks, { app: false, image: true, audit: false });
});

test('an exceptions change runs the audit only', () => {
	const { checks } = decide(['eng/osv-scanner.toml'], complete);
	assert.deepEqual(checks, { app: false, image: false, audit: true });
});

test('documents and tool notes run no gated check', () => {
	const { checks, reason } = decide(['README.md', 'eng/typos.toml', 'LICENSE'], complete);
	assert.deepEqual(checks, { app: false, image: false, audit: false });
	assert.match(reason, /inert/);
});

test('a change to the CI runs everything', () => {
	const { checks, reason } = decide(['.github/workflows/tests.yml', 'README.md'], complete);
	assert.deepEqual(checks, runEverything('').checks);
	assert.match(reason, /changes the CI/);
});

test('a file in no category runs everything and is named', () => {
	const { checks, reason } = decide(['something/new.bin', 'README.md'], complete);
	assert.deepEqual(checks, runEverything('').checks);
	assert.match(reason, /something\/new\.bin/);
});

test('an incomplete or empty list runs everything', () => {
	assert.deepEqual(decide(['README.md'], { complete: false }).checks, runEverything('').checks);
	assert.deepEqual(decide([], complete).checks, runEverything('').checks);
});

test('every check named by the workflows exists', () => {
	assert.deepEqual(Object.keys(CHECKS), ['app', 'image', 'audit']);
});
