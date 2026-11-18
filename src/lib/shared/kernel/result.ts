import type { AppError } from './app-error';

/** A successful outcome carrying its value. */
export type Ok<T> = { readonly ok: true; readonly value: T };

/** A failed outcome carrying every expected failure found, never empty. */
export type Fail = { readonly ok: false; readonly errors: readonly AppError[] };

/**
 * The outcome of an operation that can fail in an expected way (DOM-01). Built only with
 * {@link ok} and {@link fail}; bugs throw instead, and a `Result` never crosses the remote boundary.
 */
export type Result<T> = Ok<T> | Fail;

/** Builds a successful `Result` with no value. */
export function ok(): Ok<undefined>;
/** Builds a successful `Result` carrying `value`. */
export function ok<T>(value: T): Ok<T>;
export function ok<T>(value?: T): Ok<T | undefined> {
	return { ok: true, value };
}

/** Builds a failed `Result` reporting every given error together; at least one is required. */
export function fail(first: AppError, ...rest: readonly AppError[]): Fail {
	return { ok: false, errors: [first, ...rest] };
}
