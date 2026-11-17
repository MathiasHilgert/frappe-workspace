import assert from 'node:assert/strict';
import { test } from 'node:test';
import { highFindings, problemsOf } from './audit.mjs';

const valid = { id: 'GHSA-a', reason: 'dev tooling only', effectiveUntil: '2026-12-17' };

test('a documented exception inside its window has no problem', () => {
	assert.deepEqual(problemsOf([valid], '2026-11-17'), []);
	assert.deepEqual(problemsOf([valid], '2026-12-16'), []);
});

test('an exception fails on its expiry date, as osv-scanner does', () => {
	const [problem, ...rest] = problemsOf([valid], '2026-12-17');
	assert.match(problem, /GHSA-a: the exception expires on 2026-12-17/);
	assert.deepEqual(rest, []);
});

test('an exception needs a reason and an expiry', () => {
	assert.match(problemsOf([{ ...valid, reason: ' ' }], '2026-11-17')[0], /reason/);
	assert.match(problemsOf([{ id: 'GHSA-a', reason: 'x' }], '2026-11-17')[0], /never lasts forever/);
});

test('an exception more than 30 days away is refused', () => {
	assert.match(problemsOf([valid], '2026-11-01')[0], /more than 30 days/);
});

const report = (...vulnerabilities) => ({
	results: [{ packages: [{ package: { name: 'p', version: '1.0.0' }, vulnerabilities }] }]
});

test('only high, critical and unknown advisories are findings', () => {
	const found = highFindings(
		report(
			{ id: 'A', database_specific: { severity: 'LOW' } },
			{ id: 'B', database_specific: { severity: 'MODERATE' } },
			{ id: 'C', database_specific: { severity: 'HIGH' } },
			{ id: 'D', database_specific: { severity: 'CRITICAL' } },
			{ id: 'E' }
		)
	);
	assert.deepEqual(found, ['p@1.0.0 C (high)', 'p@1.0.0 D (critical)', 'p@1.0.0 E (unknown)']);
	assert.deepEqual(highFindings({}), []);
});
