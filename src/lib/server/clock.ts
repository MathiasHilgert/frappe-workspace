/** The only way server code reads the current time (TS-04), so tests can fix it. */
export type Clock = { readonly now: () => Temporal.Instant };

/** The real clock, passed in from `hooks.server.ts`. */
export const systemClock: Clock = { now: () => Temporal.Now.instant() };
