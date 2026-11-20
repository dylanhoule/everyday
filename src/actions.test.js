import assert from 'node:assert';
import { toggleHabit, toggleTask, setAmount, upsert, archiveGoal, removeHabit, deleteTask } from './actions.js';
import { merge } from './merge.js';

const T = '2026-11-19';
const run = { id: 'h', type: 'habit', goalId: 'g', title: 'Run', days: [4], startDate: '2026-11-02', amount: 3, unit: 'mi' };

let r = toggleHabit([], run, T, T, 500);
assert.deepStrictEqual(r, [{ id: 'log:h:2026-11-19', type: 'log', habitId: 'h', date: T, amount: 3, unit: 'mi', updatedAt: 500 }]);
r = toggleHabit(r, run, T, T, 600);
assert.equal(r.length, 1);
assert.equal(r[0].deleted, true);
assert.equal(r[0].updatedAt, 600);
r = toggleHabit(r, run, T, T, 700);
assert.equal(r.length, 1);
assert.equal(r[0].deleted, undefined);
assert.equal(toggleHabit([], run, '2026-11-18', T, 1).length, 1); // yesterday is open
assert.deepStrictEqual(toggleHabit([], run, '2026-11-17', T, 1), []); // locked
const old = [{ id: 'log:h:2026-11-10', type: 'log', habitId: 'h', date: '2026-11-10', amount: 3, unit: 'mi', updatedAt: 1 }];
assert.strictEqual(toggleHabit(old, run, '2026-11-10', T, 2), old); // can't uncheck a locked day
assert.equal('unit' in toggleHabit([], { ...run, unit: undefined, amount: undefined }, T, T, 1)[0], false);
assert.equal(toggleHabit([], { ...run, amount: undefined }, T, T, 1)[0].amount, 1);
// same check-off on two devices merges into one record
assert.equal(merge(toggleHabit([], run, T, T, 1), toggleHabit([], run, T, T, 2)).length, 1);

const task = { id: 't', type: 'task', title: 'Essay', date: '2026-11-15', done: false, updatedAt: 0 };
let tr = toggleTask([task], 't', T, 10);
assert.deepStrictEqual(tr[0], { ...task, done: true, doneDate: T, updatedAt: 10 });
tr = toggleTask(tr, 't', T, 11);
assert.equal(tr[0].done, false);
assert.equal('doneDate' in tr[0], false);
const lockedDone = [{ ...task, done: true, doneDate: '2026-11-10' }];
assert.strictEqual(toggleTask(lockedDone, 't', T, 12), lockedDone); // finished on a locked day stays finished

const withLog = toggleHabit([], run, T, T, 1);
assert.equal(setAmount(withLog, 'log:h:2026-11-19', 4, T, 2)[0].amount, 4);
assert.strictEqual(setAmount(old, 'log:h:2026-11-10', 9, T, 2), old);
const doneTask = [{ ...task, done: true, doneDate: T }];
assert.equal(setAmount(doneTask, 't', 2, T, 3)[0].amount, 2);

const g = { id: 'g', type: 'goal', name: 'G', path: [], createdAt: '2026-11-01', updatedAt: 0 };
assert.deepStrictEqual(upsert([], g, 5), [{ ...g, updatedAt: 5 }]);
assert.equal(upsert([g], { ...g, name: 'H' }, 6)[0].name, 'H');
assert.equal(upsert([g], { ...g, name: 'H' }, 6).length, 1);
assert.equal(archiveGoal([g], 'g', T, 7)[0].archivedOn, T);
assert.equal(removeHabit([run], 'h', T, 8)[0].endDate, '2026-11-18'); // history kept
assert.equal(removeHabit([{ ...run, startDate: T }], 'h', T, 8)[0].deleted, true); // made today: just delete
assert.deepStrictEqual(deleteTask([task], 't', 9)[0], { ...task, deleted: true, updatedAt: 9 });

console.log('actions.test.js: all assertions passed');
