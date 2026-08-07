import assert from 'node:assert';
import { merge, purge, retireStale } from './merge.js';

// newer updatedAt wins, regardless of argument order
assert.equal(merge([{ id: '1', text: 'old', updatedAt: 100 }], [{ id: '1', text: 'new', updatedAt: 200 }])[0].text, 'new');
assert.equal(merge([{ id: '1', text: 'new', updatedAt: 200 }], [{ id: '1', text: 'old', updatedAt: 100 }])[0].text, 'new');

// missing updatedAt is treated as 0 → any timestamped edit wins over a legacy record
assert.equal(merge([{ id: '2', text: 'legacy' }], [{ id: '2', text: 'edited', updatedAt: 1 }])[0].text, 'edited');

// disjoint ids from both sides are unioned
assert.equal(merge([{ id: 'x', updatedAt: 1 }], [{ id: 'y', updatedAt: 1 }]).length, 2);

// tombstone wins when it is the newer record (delete propagates)...
assert.equal(merge([{ id: '3', text: 'here', updatedAt: 100 }], [{ id: '3', deleted: true, updatedAt: 200 }])[0].deleted, true);
// ...but a newer edit beats an older delete (resurrect)
assert.equal(!!merge([{ id: '4', deleted: true, updatedAt: 100 }], [{ id: '4', text: 'back', updatedAt: 200 }])[0].deleted, false);

// purge drops only old tombstones — recent tombstones and old live tasks stay
const now = 1_000_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
const kept = purge(
  [
    { id: 'a', deleted: true, updatedAt: now - 40 * DAY }, // old tombstone → gone
    { id: 'b', deleted: true, updatedAt: now - 1 * DAY }, //  recent tombstone → kept
    { id: 'c', text: 'live', updatedAt: now - 999 * DAY }, // old but not deleted → kept
  ],
  now
).map((t) => t.id);
assert.deepEqual(kept.sort(), ['b', 'c']);

// retireStale tombstones undone seeds the current plan no longer has — tasks still in the
// plan, done history, and the user's own tasks are untouched, and existing tombstones keep
// their original timestamp.
const keep = new Set(['plan-2026-09-01-run', 'plan-2026-09-01-lift']);
const retired = Object.fromEntries(
  retireStale(
    [
      { id: 'plan-2026-09-01-strength-1', done: false }, //     dropped by new plan → tombstoned
      { id: 'plan-2026-09-01-task', done: false }, //            dropped by new plan → tombstoned
      { id: 'plan-2026-09-01-run', done: false }, //             still in the plan   → kept
      { id: 'plan-2026-09-01-lift', done: false }, //            still in the plan   → kept
      { id: 'plan-2026-08-01-strength-1', done: true }, //       done history        → kept
      { id: '3f1a-user-added', done: false }, //                 user's own task     → kept
      { id: 'plan-2026-08-02-task', deleted: true, updatedAt: 5 }, // already gone   → unchanged
    ],
    keep,
    now
  ).map((t) => [t.id, t])
);
assert.deepEqual(
  Object.values(retired)
    .filter((t) => t.deleted)
    .map((t) => t.id)
    .sort(),
  ['plan-2026-08-02-task', 'plan-2026-09-01-strength-1', 'plan-2026-09-01-task']
);
assert.equal(retired['plan-2026-09-01-strength-1'].updatedAt, now);
assert.equal(retired['plan-2026-08-02-task'].updatedAt, 5); // no tombstone refresh

console.log('merge.test.js: all assertions passed');
