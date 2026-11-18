import { createCn } from 'cn/config';

/** Text styles of `layout.css` (`text-display-xl`…`text-amount`): each sets a font size, so it merges as one. */
const TEXT_STYLES = [
	'display-xl',
	'display-l',
	'title',
	'heading',
	'body-lg',
	'body',
	'label',
	'caption',
	'amount'
];

/** Merges Tailwind class lists so later classes win over conflicting earlier ones; knows the Frappé text styles, role radii and shadows. */
export const cn = createCn({
	extend: {
		classGroups: {
			'font-size': [{ text: TEXT_STYLES }],
			rounded: [{ rounded: ['field', 'card', 'frame', 'pill'] }],
			shadow: [{ shadow: ['card', 'pop', 'frame'] }]
		}
	}
});

/** Props of a component without its `child` snippet, for wrappers that render their own. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
/** Props of a component without its `children` snippet, for wrappers that render their own. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
/** Props of a component without either content snippet. */
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
/** Props plus a bindable `ref` to the rendered element, so parents can focus or measure it. */
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
