import type { Cookies } from '@sveltejs/kit';

type CookieOptions = Parameters<Cookies['set']>[2];

/** One cookie write the code under test made. */
export type CookieWrite =
	| {
			readonly kind: 'set';
			readonly name: string;
			readonly value: string;
			readonly options: CookieOptions;
	  }
	| { readonly kind: 'delete'; readonly name: string; readonly options: CookieOptions };

/** A hand-written {@link Cookies} holding the request's cookies and recording every write. */
export class FakeCookies implements Cookies {
	readonly writes: CookieWrite[] = [];
	private readonly jar: Map<string, string>;

	constructor(initial: Record<string, string> = {}) {
		this.jar = new Map(Object.entries(initial));
	}

	get(name: string): string | undefined {
		return this.jar.get(name);
	}

	getAll(): { name: string; value: string }[] {
		return [...this.jar].map(([name, value]) => ({ name, value }));
	}

	set(name: string, value: string, options: CookieOptions): void {
		this.writes.push({ kind: 'set', name, value, options });
		this.jar.set(name, value);
	}

	delete(name: string, options: CookieOptions): void {
		this.writes.push({ kind: 'delete', name, options });
		this.jar.delete(name);
	}

	parse(): never {
		throw new Error('The fake cookies do not parse.');
	}

	serialize(): string {
		throw new Error('The fake cookies do not serialize.');
	}
}
