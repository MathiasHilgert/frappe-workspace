/** Merges Tailwind class lists so later classes win over conflicting earlier ones. */
export { cn } from 'cn';

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
