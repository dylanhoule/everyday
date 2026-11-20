import assert from 'node:assert';
import { index, habitDueOn, itemsOn, dayScore, isLocked, toKeep, historyStart, streaks, dayCell, rangeAverage } from './score.js';
import { logId } from './records.js';
import { addDays } from './date.js';

const T = '2026-11-19'; // Thursday
const goal = { id: 'g', type: 'goal', name: 'Run', title: 'Run more', color: 'orange', path: [], createdAt: '2026-11-02' };
const run = { id: 'h', type: 'habit', goalId: 'g', title: 'Run', days: [1, 2, 4, 6], startDate: '2026-11-02', amount: 3, unit: 'mi' };
const log = (habitId, date) => ({ id: logId(habitId, date), type: 'log', habitId, date, amount: 1 });
const span = (a, b) => { const out = []; for (let d = a; d <= b; d = addDays(d, 1)) out.push(d); return out; };

// habitDueOn
assert.equal(habitDueOn(run, goal, T), true);
assert.equal(habitDueOn(run, goal, '2026-11-18'), false); // Wednesday not in days
assert.equal(habitDueOn(run, goal, '2026-10-29'), false); // before startDate
assert.equal(habitDueOn({ ...run, endDate: '2026-11-17' }, goal, T), false); // habit ended
assert.equal(habitDueOn(run, { ...goal, archivedOn: T }, T), false); // archived from that day
assert.equal(habitDueOn(run, { ...goal, archivedOn: T }, '2026-11-17'), true); // past days keep counting
assert.equal(habitDueOn(run, { ...goal, date: '2026-11-18' }, T), false); // after the goal's last day
assert.equal(habitDueOn(run, { ...goal, date: '2026-11-10', endDate: '2026-11-20' }, T), true);
assert.equal(habitDueOn({ ...run, days: [] }, goal, T), false);

// itemsOn + grace on tasks
const lateOk = { id: 't1', type: 'task', title: 'A', date: T, done: true, doneDate: '2026-11-20' };
const tooLate = { id: 't2', type: 'task', title: 'B', date: T, done: true, doneDate: '2026-11-21' };
const items = itemsOn(index([goal, run, lateOk, tooLate, log('h', T)]), T);
assert.deepStrictEqual(items.map((i) => [i.kind, i.id, i.done]),
  [['habit', 'h', true], ['task', 't1', true], ['task', 't2', false]]);
assert.equal(items[0].goal.id, 'g');
assert.equal(itemsOn(index([goal, run, { ...log('h', T), deleted: true }]), T)[0].done, false); // tombstoned log

// dayScore
assert.equal(dayScore(index([goal, run, { ...tooLate }, log('h', T)]), T), 50);
assert.equal(dayScore(index([goal, run]), '2026-11-18'), null); // rest day

// lock + toKeep
assert.equal(isLocked('2026-11-18', T), false);
assert.equal(isLocked('2026-11-17', T), true);
assert.equal(toKeep(9, 5), 2); // mockup: "5 of 9 done, 2 more"
assert.equal(toKeep(9, 7), 0);
assert.equal(toKeep(0, 0), 0);

// historyStart
assert.equal(historyStart(index([goal, { ...goal, id: 'g0', createdAt: '2026-10-01', archivedOn: '2026-10-05' }])), '2026-10-01');
assert.equal(historyStart(index([])), null);

// streaks: daily habit; locked miss on 11-11 breaks, open miss on 11-18 and today don't
const daily = { ...run, id: 'd', days: [0, 1, 2, 3, 4, 5, 6] };
const runA = [goal, daily, ...span('2026-11-02', '2026-11-10').map((d) => log('d', d)), ...span('2026-11-12', '2026-11-17').map((d) => log('d', d))];
assert.deepStrictEqual(streaks(index(runA), T), { current: 6, best: { len: 9, start: '2026-11-02', end: '2026-11-10' } });
assert.equal(streaks(index([...runA, log('d', '2026-11-18')]), T).current, 7);
assert.equal(streaks(index([...runA, log('d', '2026-11-18'), log('d', T)]), T).current, 8);
// rest days (Wednesdays 11-04, 11-11, 11-18) neither count nor break
const noWed = { ...daily, id: 'w', days: [0, 1, 2, 4, 5, 6] };
const runB = [goal, noWed, ...span('2026-11-02', '2026-11-17').filter((d) => !['2026-11-04', '2026-11-11'].includes(d)).map((d) => log('w', d))];
assert.equal(streaks(index(runB), T).current, 14);
assert.deepStrictEqual(streaks(index([]), T), { current: 0, best: null });

// dayCell
const idxA = index(runA);
assert.deepStrictEqual(dayCell(idxA, '2026-11-01', T), { kind: 'none' }); // before history
assert.deepStrictEqual(dayCell(idxA, '2026-11-20', T), { kind: 'none' }); // future
assert.deepStrictEqual(dayCell(idxA, '2026-11-11', T), { kind: 'score', score: 0 });
assert.deepStrictEqual(dayCell(index(runB), '2026-11-04', T), { kind: 'rest' });

// rangeAverage: last n days ending yesterday (today excluded), previous n before that
assert.deepStrictEqual(rangeAverage(idxA, T, 7), { avg: 86, prev: 86 }); // 11-12..18 and 11-05..11: six 100s and one 0 each
assert.deepStrictEqual(rangeAverage(index([]), T, 7), { avg: null, prev: null });

console.log('score.test.js: all assertions passed');
