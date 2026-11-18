import { MediaQuery } from 'svelte/reactivity';

const DEFAULT_MOBILE_BREAKPOINT = 768;

/** Reactive media query that is true below the mobile breakpoint (768 px by default). */
export class IsMobile extends MediaQuery {
	constructor(breakpoint: number = DEFAULT_MOBILE_BREAKPOINT) {
		super(`max-width: ${String(breakpoint - 1)}px`);
	}
}
