// The dependency audit CI and `just audit` run: `bun audit` (high and critical advisories; a registry that cannot be
// queried is a failure too) with the exceptions of eng/osv-scanner.toml, the file osv-scanner reads as well. An
// exception must carry a reason and an expiry, and an expired one fails the audit instead of being ignored forever.
//
//   bun eng/scripts/audit.mjs                       check the exceptions, then run `bun audit`
//   bun eng/scripts/audit.mjs --osv=<report.json>   check the exceptions, then fail on a high or critical advisory in
//                                                   an osv-scanner JSON report (osv-scanner has no severity threshold)
//   bun eng/scripts/audit.mjs --today=YYYY-MM-DD    pretend it is that day (to try an expiry)

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const EXCEPTIONS = fileURLToPath(new URL('../osv-scanner.toml', import.meta.url));
const MAX_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

/** A TOML date as `YYYY-MM-DD`: Bun parses an unquoted date as a Temporal.PlainDate, other parsers as a Date. */
const asDay = (value) => (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10);

/**
 * Problems of the exceptions on a given day (empty when every one is valid).
 * @param {{ id?: string, effectiveUntil?: unknown, reason?: string }[]} exceptions
 * @param {string} today `YYYY-MM-DD`
 */
export function problemsOf(exceptions, today) {
	const problems = [];
	for (const { id, effectiveUntil, reason } of exceptions) {
		if (!id) {
			problems.push('an exception has no id');
			continue;
		}
		if (!reason?.trim()) {
			problems.push(`${id}: write the reason it is accepted`);
		}
		if (effectiveUntil === undefined) {
			problems.push(`${id}: set effectiveUntil, an exception never lasts forever`);
			continue;
		}
		const until = asDay(effectiveUntil);
		if (until <= today) {
			problems.push(
				`${id}: the exception expires on ${until} and that day has come; fix the advisory or renew it with a new reason`
			);
		} else if (Date.parse(until) - Date.parse(today) > MAX_DAYS * DAY) {
			problems.push(`${id}: ${until} is more than ${MAX_DAYS} days away`);
		}
	}
	return problems;
}

const BELOW_HIGH = new Set(['LOW', 'MODERATE', 'MEDIUM']);

/**
 * @typedef {{ id: string, database_specific?: { severity?: string } }} Advisory
 * @param {{ package: { name: string, version: string }, vulnerabilities?: Advisory[] }} entry
 */
function highAdvisories({ package: pkg, vulnerabilities = [] }) {
	return vulnerabilities
		.map(({ id, database_specific: details }) => ({
			id,
			severity: details?.severity?.toUpperCase() ?? 'UNKNOWN'
		}))
		.filter(({ severity }) => !BELOW_HIGH.has(severity))
		.map(({ id, severity }) => `${pkg.name}@${pkg.version} ${id} (${severity.toLowerCase()})`);
}

/**
 * The advisories of an osv-scanner JSON report that are high or critical; one of unknown severity counts as high.
 * @param {{ results?: { packages?: Parameters<typeof highAdvisories>[0][] }[] }} report
 * @returns {string[]} `package@version advisory (severity)`
 */
export function highFindings(report) {
	return (report.results ?? []).flatMap(({ packages = [] }) => packages.flatMap(highAdvisories));
}

/** Prints the problems as annotations and returns whether there were none. */
function report(problems) {
	for (const problem of problems) {
		console.error(`::error file=eng/osv-scanner.toml::${problem}`);
	}
	return problems.length === 0;
}

/** Fails on a high or critical advisory in an osv-scanner report. */
function checkOsv(path, honored) {
	const findings = highFindings(JSON.parse(readFileSync(path, 'utf8')));
	for (const finding of findings) {
		console.error(`::error::${finding}`);
	}
	console.log(
		`osv-scanner: ${findings.length} high or critical advisor${findings.length === 1 ? 'y' : 'ies'} (${honored} exception(s) honored).`
	);
	return findings.length > 0 ? 1 : 0;
}

const argument = (args, name) =>
	args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);

function main(args) {
	const today = argument(args, '--today') ?? new Date().toISOString().slice(0, 10);
	const exceptions = Bun.TOML.parse(readFileSync(EXCEPTIONS, 'utf8')).IgnoredVulns ?? [];
	if (!report(problemsOf(exceptions, today))) {
		return 1;
	}

	const osvReport = argument(args, '--osv');
	if (osvReport) {
		return checkOsv(osvReport, exceptions.length);
	}

	const flags = exceptions.map(({ id }) => `--ignore=${id}`);
	return (
		spawnSync('bun', ['audit', '--audit-level=high', ...flags], { stdio: 'inherit' }).status ?? 1
	);
}

if (import.meta.main) {
	process.exit(main(process.argv.slice(2)));
}
