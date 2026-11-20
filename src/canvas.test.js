import assert from 'node:assert';
import { dueGroups } from './canvas.js';

const T = '2026-11-20'; // Friday
const now = new Date(2026, 10, 20, 12, 0).getTime(); // local noon
const at = (d, h, m) => new Date(2026, 10, d, h, m).toISOString(); // a local time as a UTC ISO string
const ev = (uid, title, extra) => ({ uid, title, ...extra });

const groups = dueGroups([
  ev('a', 'Done this morning', { allDay: false, start: at(20, 9, 0) }),
  ev('b', 'Late', { allDay: false, start: at(20, 23, 59) }),
  ev('c', 'All day today', { allDay: true, date: '2026-11-20' }),
  ev('d', 'Morning', { allDay: false, start: at(21, 8, 0) }),
  ev('e', 'Quiz', { allDay: true, date: '2026-11-24' }),
  ev('f', 'Too far', { allDay: true, date: '2026-12-04' }), // today + 14
  ev('g', 'Yesterday', { allDay: true, date: '2026-11-19' }),
], T, now);

assert.deepStrictEqual(groups.map((g) => [g.date, g.label, g.events.map((e) => [e.title, e.time])]), [
  ['2026-11-20', 'Today', [['Late', '23:59'], ['All day today', null]]],
  ['2026-11-21', 'Tomorrow', [['Morning', '08:00']]],
  ['2026-11-24', 'Tue Nov 24', [['Quiz', null]]],
]);
// 11:59 PM local on the 24th, written the way Canvas sends it (UTC): stays on the 24th
assert.equal(dueGroups([ev('z', 'Essay', { allDay: false, start: at(24, 23, 59) })], T, now)[0].date, '2026-11-24');
assert.deepStrictEqual(dueGroups([], T, now), []);

console.log('canvas.test.js: all assertions passed');
