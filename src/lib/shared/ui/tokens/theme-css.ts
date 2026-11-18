/** One CSS rule of the stylesheet; `media` is the enclosing `@media` prelude, when there is one. */
export type CssBlock = {
	readonly selector: string;
	readonly media?: string;
	readonly declarations: Readonly<Record<string, string>>;
};

/** A theme scope of the stylesheet: `.light`, `.dark`, or the OS-dark media query. */
export type ThemeName = 'light' | 'dark' | 'darkMedia';

const VAR = /var\((?<name>--[\w-]+)\)/g;

function stripComments(css: string): string {
	return css.replaceAll(/\/\*[\s\S]*?\*\//g, '');
}

function parseDeclarations(body: string): Record<string, string> {
	const out: Record<string, string> = {};
	let depth = 0;
	let current = '';
	const flush = () => {
		const index = current.indexOf(':');
		if (index > 0) out[current.slice(0, index).trim()] = current.slice(index + 1).trim();
		current = '';
	};
	for (const char of body) {
		if (char === '{') depth++;
		if (char === '}') depth--;
		if (char === ';' && depth === 0) flush();
		else current += char;
	}
	flush();
	return out;
}

/** Index just past the `}` that closes the `{` at `open`. */
function endOfBlock(text: string, open: number): number {
	let depth = 1;
	let close = open + 1;
	for (; depth > 0 && close < text.length; close++) {
		depth += text[close] === '{' ? 1 : text[close] === '}' ? -1 : 0;
	}
	return close;
}

/** Flattens a stylesheet into its rules, descending into `@media` only; nested blocks of other at-rules stay in the text. */
export function parseBlocks(css: string, media?: string): readonly CssBlock[] {
	const text = stripComments(css);
	const blocks: CssBlock[] = [];
	let cursor = 0;
	for (;;) {
		const open = text.indexOf('{', cursor);
		if (open === -1) break;
		const statementEnd = text.indexOf(';', cursor);
		if (statementEnd !== -1 && statementEnd < open) {
			cursor = statementEnd + 1;
			continue;
		}
		const close = endOfBlock(text, open);
		const prelude = text.slice(cursor, open).trim().replaceAll(/\s+/g, ' ');
		const body = text.slice(open + 1, close - 1);
		if (prelude.startsWith('@media')) {
			blocks.push(...parseBlocks(body, prelude.slice('@media'.length).trim()));
		} else {
			blocks.push({
				selector: prelude,
				declarations: parseDeclarations(body),
				...(media === undefined ? {} : { media })
			});
		}
		cursor = close;
	}
	return blocks;
}

function selectors(block: CssBlock): readonly string[] {
	return block.selector.split(',').map((s) => s.trim());
}

/**
 * The custom properties each theme scope of the stylesheet defines, with `var(--x)` aliases resolved inside the scope:
 * `light` is `.light`, `dark` is `.dark`, `darkMedia` is `:root:not(.light)` under `prefers-color-scheme: dark`.
 */
export function readThemes(
	css: string
): Readonly<Record<ThemeName, Readonly<Record<string, string>>>> {
	const blocks = parseBlocks(css);
	const has = (block: CssBlock, selector: string) => selectors(block).includes(selector);
	const merge = (picked: readonly CssBlock[]) =>
		picked.reduce<Record<string, string>>((all, b) => ({ ...all, ...b.declarations }), {});
	const plain = (selector: string) =>
		blocks.filter((b) => b.media === undefined && has(b, selector));
	const resolve = (scope: Record<string, string>) => {
		const resolveValue = (value: string, seen: readonly string[]): string =>
			value.replaceAll(VAR, (match, name: string) => {
				const next = scope[name];
				return next === undefined || seen.includes(name)
					? match
					: resolveValue(next, [...seen, name]);
			});
		return Object.fromEntries(Object.entries(scope).map(([k, v]) => [k, resolveValue(v, [k])]));
	};
	const darkMedia = blocks.filter(
		(b) => b.media === '(prefers-color-scheme: dark)' && has(b, ':root:not(.light)')
	);
	return {
		light: resolve(merge(plain('.light'))),
		dark: resolve(merge(plain('.dark'))),
		darkMedia: resolve(merge([...plain(':root'), ...darkMedia]))
	};
}
