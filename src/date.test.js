import assert from 'node:assert';
import { iso, dayParts, addDays, weekday, weekStart, daysBetween } from './date.js';

// iso() uses local parts, so no UTC off-by-one, even for Jan 1.
assert.equal(iso(new Date(2026, 0, 1)), '2026-01-01');
assert.equal(iso(new Date(2026, 6, 20)), '2026-07-20');
// zero-padding
assert.equal(iso(new Date(2026, 8, 3)), '2026-09-03');

// dayParts round-trips the iso string as a local date.
assert.equal(iso(dayParts('2026-07-20')), '2026-07-20');

assert.equal(addDays('2026-11-19', 1), '2026-11-20');
assert.equal(addDays('2026-11-30', 1), '2026-12-01');
assert.equal(addDays('2026-01-01', -1), '2025-12-31');
assert.equal(weekday('2026-11-19'), 4); // Thursday
assert.equal(weekStart('2026-11-19'), '2026-11-16');
assert.equal(weekStart('2026-11-16'), '2026-11-16');
assert.equal(weekStart('2026-11-22'), '2026-11-16'); // Sunday closes the week
assert.equal(daysBetween('2026-11-19', '2027-01-01'), 43); // mockup's "43 days to go"
assert.equal(daysBetween('2026-10-31', '2026-11-02'), 2); // across US DST end
assert.equal(daysBetween('2026-03-07', '2026-03-09'), 2); // across US DST start
assert.equal(addDays('2026-03-08', 1), '2026-03-09');

console.log('date.test.js: all assertions passed');
