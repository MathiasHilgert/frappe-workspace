import type { RequestEvent } from '@sveltejs/kit';
import type { ResolveOptions } from '@sveltejs/kit/hooks';
import { describe, expect, it } from 'vitest';
import { baseLocale, getTextDirection } from '#lib/paraglide/runtime.js';
import { fakeRequestEvent } from '../../../../tests/support/request-event';
import { handleParaglide } from './paraglide';

describe('handleParaglide', () => {
	it("writes the request's locale and its text direction into app.html", async () => {
		let html = '';
		const resolve = async (_event: RequestEvent, opts?: ResolveOptions) => {
			html =
				(await opts?.transformPageChunk?.({
					html: '<html lang="%paraglide.lang%" dir="%paraglide.dir%">',
					done: true
				})) ?? '';
			return new Response(html);
		};

		await handleParaglide({ event: fakeRequestEvent(), resolve });

		expect(html).toBe(`<html lang="${baseLocale}" dir="${getTextDirection(baseLocale)}">`);
	});
});
