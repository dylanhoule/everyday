import assert from 'node:assert';
import { migrate, logId, blankHabit, blankTask, blankGoal } from './records.js';

const out = migrate([
  { id: 'a', text: 'Buy milk\n2%, not whole', done: false, date: '2026-11-18', updatedAt: 5 },
  { id: 'b', text: 'Call mom', done: true, date: '2026-11-01', doneDate: '2026-11-02' },
  { id: 'plan-2026-11-20-run', text: 'Run', done: false, date: '2026-11-20', updatedAt: 3 },
  { id: 'plan-2026-10-01-run', text: 'Run', done: true, date: '2026-10-01', doneDate: '2026-10-01', updatedAt: 3 },
  { id: 'g1', type: 'goal', name: 'X', path: [], createdAt: '2026-11-01', updatedAt: 9 },
  { text: 'no id' },
  null,
], 1000);

assert.deepStrictEqual(out.find((r) => r.id === 'a'),
  { id: 'a', type: 'task', title: 'Buy milk', note: '2%, not whole', done: false, date: '2026-11-18', updatedAt: 5 });
assert.deepStrictEqual(out.find((r) => r.id === 'b'),
  { id: 'b', type: 'task', title: 'Call mom', done: true, date: '2026-11-01', doneDate: '2026-11-02', updatedAt: 0 });
const stale = out.find((r) => r.id === 'plan-2026-11-20-run');
assert.equal(stale.deleted, true); // undone old-plan task retired
assert.equal(stale.updatedAt, 1000);
assert.equal(out.find((r) => r.id === 'plan-2026-10-01-run').deleted, undefined); // done history kept
assert.deepStrictEqual(out.find((r) => r.id === 'g1'),
  { id: 'g1', type: 'goal', name: 'X', path: [], createdAt: '2026-11-01', updatedAt: 9 }); // typed records untouched
assert.equal(out.length, 5); // id-less and null dropped
assert.deepStrictEqual(migrate(out, 2000), out); // idempotent

assert.equal(logId('h1', '2026-11-19'), 'log:h1:2026-11-19');

const h = blankHabit({ id: 'g', measure: { unit: 'mi', target: 15, per: 'week' } }, '2026-11-19');
assert.equal(h.type, 'habit');
assert.equal(h.goalId, 'g');
assert.equal(h.unit, 'mi'); // pre-filled from the goal measure
assert.deepStrictEqual(h.days, [0, 1, 2, 3, 4, 5, 6]);
assert.equal(h.startDate, '2026-11-19');
assert.equal('unit' in blankHabit({ id: 'g' }, '2026-11-19'), false);

assert.deepStrictEqual(Object.keys(blankTask('2026-11-19', 'g')).sort(),
  ['date', 'done', 'goalId', 'id', 'title', 'type']);
const g = blankGoal('2026-11-19');
assert.equal(g.createdAt, '2026-11-19');
assert.deepStrictEqual(g.path, []);

console.log('records.test.js: all assertions passed');
