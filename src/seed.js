// Seed batches: goals, habits, and tasks written by Claude from a plan (/seed-goals skill).
//
// Each batch applies once, right after a device's first successful sync pull, and leaves a
// synced `seedmark:<batch id>` record so no other device applies it again (records.js
// applySeeds). Ids are stable: goal `seed:<goal>`, habit `seed:<goal>:<habit>`, task
// `seed:<goal>:t:<task>`. Re-seeding a goal = a NEW batch that reuses its slug; never edit an
// applied batch in place. Applied batches can be deleted from this file at any time.
// `npm test` (seed.test.js) rejects malformed batches.
export const SEEDS = [];
