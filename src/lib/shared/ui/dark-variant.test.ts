import { readFileSync } from 'node:fs';
import { compile } from 'tailwindcss';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../../../routes/layout.css', import.meta.url), 'utf8');

/** The `@custom-variant dark { … }` block of layout.css, brace to brace. */
function darkVariant(): string {
	const start = css.indexOf('@custom-variant dark');
	let depth = 0;
	for (let i = css.indexOf('{', start); i < css.length; i++) {
		depth += css[i] === '{' ? 1 : css[i] === '}' ? -1 : 0;
		if (depth === 0) return css.slice(start, i + 1);
	}
	throw new Error('@custom-variant dark is not closed');
}

async function build(candidate: string): Promise<string> {
	const compiler = await compile(`${darkVariant()}\n@tailwind utilities;`);
	return compiler.build([candidate]);
}

const flat = (text: string) => text.replaceAll(/\s+/g, ' ');

describe('the dark: variant in layout.css', () => {
	it('applies under the OS-dark media query unless the element has a .light ancestor or is .light', async () => {
		const out = flat(await build('dark:[color:red]'));

		expect(out).toContain('@media (prefers-color-scheme: dark)');
		expect(out).toMatch(/:where\(:not\(\.light, \.light \*\)\)/);
	});

	it('forces dark on .dark and its descendants', async () => {
		const out = flat(await build('dark:[color:red]'));

		expect(out).toMatch(/:where\(\.dark, \.dark \*\)/);
	});

	it('keeps both branches painting the declaration of the utility', async () => {
		const out = flat(await build('dark:[color:red]'));

		expect(out.match(/color: red/g)).toHaveLength(2);
	});

	it('does not tell a .light nested inside .dark apart (documented limitation)', async () => {
		const out = flat(await build('dark:[color:red]'));

		// `.dark *` matches a `.light` descendant, and nothing excludes it from that branch.
		const darkRule = /(?<selector>[^{}]*:where\(\.dark, \.dark \*\)) \{/.exec(out)?.groups
			?.selector;

		expect(darkRule).toBeDefined();
		expect(darkRule).not.toContain('.light');
	});
});
