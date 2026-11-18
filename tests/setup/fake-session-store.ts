import type { Session } from '../../src/lib/server/session/session';
import {
	sessionUnavailableCode,
	type SessionStore,
	type SessionStoreOperation
} from '../../src/lib/server/session/session-store';
import { fail, ok, type Result } from '../../src/lib/shared/kernel/result';

/** What the fake did, in order: `read`, `save`, `delete` or `ping` with the sid it got. */
export type StoreCall = {
	readonly operation: SessionStoreOperation;
	readonly sid?: string;
};

/**
 * A hand-written in-memory {@link SessionStore} for hook and helper unit tests (TEST-04): assert
 * on `sessions` and `calls`. Set `failing` to make every call answer `unavailable`.
 */
export class FakeSessionStore implements SessionStore {
	readonly sessions = new Map<string, Session>();
	readonly calls: StoreCall[] = [];
	failing = false;

	private outcome<T>(operation: SessionStoreOperation, value: T, sid?: string): Result<T> {
		this.calls.push(sid === undefined ? { operation } : { operation, sid });
		if (!this.failing) return ok(value);
		return fail({
			kind: 'unavailable',
			code: sessionUnavailableCode,
			params: { operation, errorName: 'Error', errorCode: 'ECONNREFUSED' }
		});
	}

	read(sid: string): Promise<Result<Session | undefined>> {
		return Promise.resolve(this.outcome('read', this.sessions.get(sid), sid));
	}

	save(sid: string, session: Session): Promise<Result<undefined>> {
		const result = this.outcome('save', undefined, sid);
		if (result.ok) this.sessions.set(sid, session);
		return Promise.resolve(result);
	}

	delete(sid: string): Promise<Result<undefined>> {
		const result = this.outcome('delete', undefined, sid);
		if (result.ok) this.sessions.delete(sid);
		return Promise.resolve(result);
	}

	ping(): Promise<Result<undefined>> {
		return Promise.resolve(this.outcome('ping', undefined));
	}
}
