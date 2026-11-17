// Pull requests carry no trace of an AI assistant: not in the title, the description or any commit message. Same rule
// as frappe-api. Run as a script, it reads a text on stdin, prints the offending lines and fails when there are any:
//   printf '%s\n%s\n' "$TITLE" "$BODY" | node eng/scripts/attribution.mjs
// The tests next to this file pin the patterns.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Traces an AI assistant leaves in a message: co-author trailers, "generated with" footers, session links.
const AI_ATTRIBUTION = [
	/co-authored-by:[^\n]*(claude|anthropic|openai|chatgpt|gpt-\d|copilot|gemini|cursor|codex|devin|aider|windsurf)/i,
	/co-authored-by:[^\n]*noreply@(anthropic|openai)\.com/i,
	/generated (with|by) [^\n]*(claude|chatgpt|copilot|gemini|cursor|codex|\bai\b)/i,
	/claude\.(ai|com)\/code/i,
	/claude-session:/i,
	/\u{1F916}/u
];

/**
 * Lines of a text that look like an AI assistant's attribution.
 * @param {string | null | undefined} text
 * @returns {string[]}
 */
export function findAiAttribution(text) {
	return (text ?? '')
		.split('\n')
		.filter((line) => AI_ATTRIBUTION.some((pattern) => pattern.test(line)))
		.map((line) => line.trim());
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const lines = findAiAttribution(readFileSync(0, 'utf8'));
	for (const line of lines) {
		console.error(`::error::AI attribution is not allowed: "${line}"`);
	}
	process.exit(lines.length > 0 ? 1 : 0);
}
