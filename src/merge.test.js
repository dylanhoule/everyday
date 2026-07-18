import assert from 'node:assert';
import { merge, purge } from './merge.js';

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

console.log('merge.test.js: all assertions passed');
