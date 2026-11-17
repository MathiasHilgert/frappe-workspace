// Turns the json-summary report of `bun run test:coverage` into Markdown for the job summary. It only reports: no
// percentage fails anything (TEST-09).
//
//   bun eng/scripts/coverage-summary.mjs [report.json]   (default .svelte-kit/coverage/coverage-summary.json)

import { readFileSync } from 'node:fs';
import { relative } from 'node:path';

const METRICS = /** @type {const} */ (['lines', 'statements', 'functions', 'branches']);
const LOWEST = 15;

/**
 * @typedef {Record<(typeof METRICS)[number], { total: number, covered: number, pct: number }>} Counts
 * @param {Record<string, Counts>} summary the vitest json-summary report, with a `total` entry
 * @param {string} root what file paths are shown relative to
 */
export function render(summary, root) {
	const { total, ...files } = summary;
	const percent = (/** @type {{ pct: number | string }} */ metric) => `${metric.pct}%`;
	const lines = [
		'### Coverage',
		'',
		'Server, component and integration tests together. Reported only: no percentage fails the build.',
		'',
		`| ${METRICS.join(' | ')} |`,
		`|${METRICS.map(() => '---').join('|')}|`,
		`| ${METRICS.map((metric) => percent(total[metric])).join(' | ')} |`
	];

	const lowest = Object.entries(files)
		.filter(([, counts]) => counts.lines.total > 0)
		.sort(([, a], [, b]) => a.lines.pct - b.lines.pct)
		.slice(0, LOWEST);
	if (lowest.length > 0) {
		lines.push(
			'',
			`<details><summary>Least covered files (${lowest.length} of ${Object.keys(files).length})</summary>`,
			''
		);
		lines.push('| file | lines | functions | branches |', '|---|---|---|---|');
		for (const [file, counts] of lowest) {
			lines.push(
				`| \`${relative(root, file)}\` | ${percent(counts.lines)} | ${percent(counts.functions)} | ${percent(counts.branches)} |`
			);
		}
		lines.push('', '</details>');
	}

	return `${lines.join('\n')}\n`;
}

if (import.meta.main) {
	const report = process.argv[2] ?? '.svelte-kit/coverage/coverage-summary.json';
	process.stdout.write(render(JSON.parse(readFileSync(report, 'utf8')), process.cwd()));
}
