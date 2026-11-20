import assert from 'node:assert';
import { migrate, logId, blankHabit, blankTask, blankGoal, syncMerge, changedOnly, nextPhase } from './records.js';

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

// syncMerge: junk in the remote blob never reaches merge()
const merged = syncMerge([{ id: 'x', type: 'task', title: 'X', date: '2026-11-19', done: false, updatedAt: 1 }],
  [null, 42, { text: 'no id' }, { id: 'y', text: 'Legacy', done: false, date: '2026-11-19', updatedAt: 2 }], 1000);
assert.deepStrictEqual(merged.map((r) => r.id).sort(), ['x', 'y']);
assert.equal(merged.find((r) => r.id === 'y').type, 'task');

// changedOnly: unchanged records are not re-saved (so they can't clobber another device's edit)
const h1 = { id: 'h1', type: 'habit', title: 'A', days: [1] };
const h2 = { id: 'h2', type: 'habit', title: 'B', days: [2] };
const fresh = { id: 'h3', type: 'habit', title: 'C', days: [3] };
assert.deepStrictEqual(changedOnly([h1, h2], [h1, { ...h2, title: 'B2' }, fresh]).map((r) => r.id), ['h2', 'h3']);

// nextPhase: starts the day after the last phase, or today when that end is missing
assert.deepStrictEqual(nextPhase([], '2026-11-19'), { name: '', start: '2026-11-19', end: '2026-12-02' });
assert.equal(nextPhase([{ name: 'A', start: '2026-11-01', end: '2026-11-20' }], '2026-11-19').start, '2026-11-21');
assert.equal(nextPhase([{ name: 'A', start: '2026-11-01' }], '2026-11-19').start, '2026-11-19');

console.log('records.test.js: all assertions passed');
