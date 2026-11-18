/**
 * The closed set of error kinds, mirroring frappe-api's error kinds (DOM-02).
 */
export const appErrorKinds = [
	'invalidValue',
	'ruleViolation',
	'notFound',
	'unavailable',
	'unauthenticated',
	'forbidden',
	'rateLimited',
	'preconditionFailed',
	'conflict'
] as const;

/** One of the nine error kinds shared with frappe-api. */
export type AppErrorKind = (typeof appErrorKinds)[number];

/** Primitive values an error may carry for message interpolation; never personal data. */
export type AppErrorParams = Readonly<Record<string, string | number | boolean>>;

/**
 * An expected failure (DOM-02). API errors keep the API `code` and copy its localized problem
 * `detail` into `message`; BFF errors use `workspace.<subject>.<problem>`. A published code is
 * never renamed.
 */
export type AppError = {
	readonly kind: AppErrorKind;
	readonly code: string;
	readonly message?: string;
	readonly params?: AppErrorParams;
};

/**
 * Fails compilation when a `switch` over a closed union misses a case, and throws if an
 * unexpected value still arrives at runtime (a bug, not an expected failure).
 */
export function assertNever(value: never): never {
	throw new Error(`Unexpected value: ${String(value)}`);
}
