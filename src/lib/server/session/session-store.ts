import { createHash } from 'node:crypto';
import { fail, ok, type Fail, type Result } from '#lib/shared/kernel/result.js';
import type { AppError } from '#lib/shared/kernel/app-error.js';
import type { Clock } from '../clock';
import { sessionSchema, type Session } from './session';

/** Which store call failed; the only thing about a failure that reaches a log line (S11). */
export type SessionStoreOperation = 'read' | 'save' | 'delete' | 'ping';

/**
 * The session store (DES-02): sessions by sid in the BFF's own Valkey. Every failure is a
 * `Result`: `unavailable` when Valkey does not answer, `ruleViolation` when asked to save an
 * expired session. The store never logs; its caller decides.
 */
export interface SessionStore {
	/** The stored session, or `undefined` when there is none, or when the value was unreadable (its key is then deleted). */
	read(sid: string): Promise<Result<Session | undefined>>;
	/** Stores `session` until its `absoluteExpiresAt`; an expiry already past fails as `expired`, a session that breaks the schema as `invalid`. */
	save(sid: string, session: Session): Promise<Result<undefined>>;
	/** Deletes the key of `sid`; deleting a missing key succeeds. */
	delete(sid: string): Promise<Result<undefined>>;
	/** Succeeds when Valkey answers `PING` within the client's command timeout. */
	ping(): Promise<Result<undefined>>;
}

/** The Valkey calls the store makes; an ioredis client or a hand-written fake satisfies it. */
export type SessionStoreClient = {
	get(key: string): Promise<string | null>;
	set(key: string, value: string, expiryMode: 'PXAT', unixMilliseconds: number): Promise<unknown>;
	del(key: string): Promise<unknown>;
	ping(): Promise<unknown>;
};

/** Code of the failure answered when Valkey does not respond (SEC-03). */
export const sessionUnavailableCode = 'workspace.session.unavailable';
/** Code of the failure answered when a session to save has already expired. */
export const sessionExpiredCode = 'workspace.session.expired';

/** Code of the failure answered when a session to save does not satisfy the session schema. */
export const sessionInvalidCode = 'workspace.session.invalid';

/** The key of a sid: its hash, so a Valkey dump or `KEYS` never lists a usable sid (S12). */
export function sessionKey(sid: string): string {
	return `workspace:session:${createHash('sha256').update(sid).digest('base64url')}`;
}

/**
 * The only fields of a client error that may reach a log line (S11). The raw error is never
 * kept: an ioredis error carries `command.args` with the sid and the token.
 */
export function clientErrorFields(cause: unknown): { errorName: string; errorCode?: string } {
	const errorName = cause instanceof Error ? cause.name : typeof cause;
	const code = cause instanceof Error && 'code' in cause ? cause.code : undefined;
	return typeof code === 'string' ? { errorName, errorCode: code } : { errorName };
}

/** What a store failure may put in a log line (S11): the operation, the error kind and the client error's name and code. */
export function failureLogFields(failure: Fail): Record<string, string | undefined> {
	const [first] = failure.errors;
	const params = first?.params;
	const text = (key: string): string | undefined => {
		const value = params?.[key];
		return typeof value === 'string' ? value : undefined;
	};
	return {
		operation: text('operation'),
		kind: first?.kind,
		errorName: text('errorName'),
		errorCode: text('errorCode')
	};
}

function unavailable(operation: SessionStoreOperation, cause: unknown): AppError {
	return {
		kind: 'unavailable',
		code: sessionUnavailableCode,
		params: { operation, ...clientErrorFields(cause) }
	};
}

/** Builds the Valkey-backed {@link SessionStore} over one process-wide client (SEC-02, S12). */
export function createSessionStore(client: SessionStoreClient, clock: Clock): SessionStore {
	async function attempt<T>(
		operation: SessionStoreOperation,
		call: () => Promise<T>
	): Promise<Result<T>> {
		try {
			return ok(await call());
		} catch (error) {
			return fail(unavailable(operation, error));
		}
	}

	return {
		async read(sid) {
			const key = sessionKey(sid);
			const raw = await attempt('read', () => client.get(key));
			if (!raw.ok) return raw;
			if (raw.value === null) return ok(undefined);

			const parsed = parseStored(raw.value);
			if (parsed !== undefined) return ok(parsed);

			const deleted = await attempt('read', () => client.del(key));
			return deleted.ok ? ok(undefined) : deleted;
		},

		async save(sid, session) {
			// Only a session `read` would accept is written; the schema guarantees the instant parses.
			if (!sessionSchema.safeParse(session).success) {
				return fail({ kind: 'invalidValue', code: sessionInvalidCode });
			}
			const expiresAt = Temporal.Instant.from(session.absoluteExpiresAt);
			if (Temporal.Instant.compare(expiresAt, clock.now()) <= 0) {
				return fail({ kind: 'ruleViolation', code: sessionExpiredCode });
			}
			// One SET with PXAT: the value and its expiry land together, never SET then EXPIRE.
			const saved = await attempt('save', () =>
				client.set(sessionKey(sid), JSON.stringify(session), 'PXAT', expiresAt.epochMilliseconds)
			);
			return saved.ok ? ok(undefined) : saved;
		},

		async delete(sid) {
			const deleted = await attempt('delete', () => client.del(sessionKey(sid)));
			return deleted.ok ? ok(undefined) : deleted;
		},

		async ping() {
			const pong = await attempt('ping', () => client.ping());
			return pong.ok ? ok(undefined) : pong;
		}
	};
}

function parseStored(raw: string): Session | undefined {
	try {
		const parsed = sessionSchema.safeParse(JSON.parse(raw));
		return parsed.success ? parsed.data : undefined;
	} catch {
		return undefined;
	}
}
