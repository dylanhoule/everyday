import assert from 'node:assert';
import { iso, monthInfo, dayParts } from './date.js';

// iso() uses local parts — no UTC off-by-one, even for Jan 1.
assert.equal(iso(new Date(2026, 0, 1)), '2026-01-01');
assert.equal(iso(new Date(2026, 6, 20)), '2026-07-20');
// zero-padding
assert.equal(iso(new Date(2026, 8, 3)), '2026-09-03');

// month geometry: July 2026 has 31 days; grid = leading blanks + days.
const jul = monthInfo(2026, 6);
assert.equal(jul.count, 31);
assert.equal(jul.firstWeekday, new Date(2026, 6, 1).getDay());
assert.equal(jul.firstWeekday + jul.count <= 37, true); // fits 6 rows
// February leap-year sanity
assert.equal(monthInfo(2024, 1).count, 29);
assert.equal(monthInfo(2026, 1).count, 28);

// dayParts round-trips the iso string as a local date.
assert.equal(iso(dayParts('2026-07-20')), '2026-07-20');

console.log('date.test.js: all assertions passed');
