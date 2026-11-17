import assert from 'node:assert/strict';
import { test } from 'node:test';
import { render } from './coverage-summary.mjs';

const counts = (pct) => ({ total: 10, covered: pct / 10, pct });
const entry = (pct) => ({
	lines: counts(pct),
	statements: counts(pct),
	functions: counts(pct),
	branches: counts(pct)
});

test('the report shows the totals and the least covered files first, and shows no threshold', () => {
	const markdown = render(
		{
			total: entry(80),
			'/repo/src/a.ts': entry(100),
			'/repo/src/b.ts': entry(40),
			'/repo/src/empty.ts': { ...entry(0), lines: { total: 0, covered: 0, pct: 100 } }
		},
		'/repo'
	);
	assert.match(markdown, /\| 80% \| 80% \| 80% \| 80% \|/);
	assert.ok(markdown.indexOf('src/b.ts') < markdown.indexOf('src/a.ts'));
	assert.doesNotMatch(markdown, /threshold|minimum/i);
	assert.doesNotMatch(markdown, /empty\.ts/);
});
