import assert from 'node:assert';
import { QUOTES, quoteIndex, quoteFor } from './quotes.js';

assert.equal(QUOTES.length, 100);
assert.equal(new Set(QUOTES.map(([text]) => text)).size, 100); // no duplicates
assert.ok(QUOTES.every(([text, by]) => text && by && !/—/.test(text + by))); // no em dashes
// Shuffled, one per day: every quote shows once per 100-day cycle, in a new order each cycle.
for (const cycle of [0, 1, 300]) {
  const days = Array.from({ length: 100 }, (_, i) => quoteIndex(cycle * 100 + i));
  assert.equal(new Set(days).size, 100, `cycle ${cycle} repeats a quote`);
}
const order = (c) => Array.from({ length: 100 }, (_, i) => quoteIndex(c * 100 + i)).join();
assert.notEqual(order(0), order(1));
assert.notEqual(order(0), QUOTES.map((_, i) => i).join()); // not just list order
assert.deepStrictEqual(quoteFor('2026-11-21'), quoteFor('2026-11-21')); // same all day
console.log('quotes.test.js: all assertions passed');
