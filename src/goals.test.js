import assert from 'node:assert';
import { index } from './score.js';
import { logId } from './records.js';
import { addDays } from './date.js';
import { currentPhase, measureProgress, measureText, goalPct, goalStatus, habitWeek, headline, barFill, summary, dateLabel, goalReason, coachNote, sideBadge, activeGoals } from './goals.js';

const T = '2026-11-19';
const log = (habitId, date, extra = {}) => ({ id: logId(habitId, date), type: 'log', habitId, date, amount: 1, ...extra });
const span = (a, b) => { const out = []; for (let d = a; d <= b; d = addDays(d, 1)) out.push(d); return out; };

// Half marathon, shaped like the mockup
const hm = { id: 'hm', type: 'goal', name: 'Half marathon', title: 'Half marathon in under 2:00', color: 'orange',
  date: '2027-01-01', measure: { unit: 'mi', target: 15, per: 'week' }, createdAt: '2026-11-02',
  path: [{ name: 'Rebuild', start: '2026-11-09', end: '2026-11-22', target: 15 },
         { name: 'Build: 20 mi weeks', start: '2026-11-23', end: '2026-12-06', target: 20 }] };
const run = { id: 'run', type: 'habit', goalId: 'hm', title: 'Run 4× a week', days: [1, 2, 4, 6], startDate: '2026-11-02', amount: 3, unit: 'mi' };
const lights = { id: 'lights', type: 'habit', goalId: 'hm', title: 'Lights out by 11:30', days: [0, 1, 2, 3, 4, 5, 6], startDate: '2026-11-02' };
const longRun = { id: 'long', type: 'habit', goalId: 'hm', title: 'Sunday long run', days: [0], startDate: '2026-11-02', amount: 5, unit: 'mi' };
const hmIdx = index([hm, run, lights, longRun,
  log('run', '2026-11-16', { amount: 3, unit: 'mi' }), log('run', '2026-11-17', { amount: 3, unit: 'mi' }),
  log('lights', '2026-11-16'), log('lights', '2026-11-17')]);

// phases
assert.equal(currentPhase(hm, T).index, 0);
assert.equal(currentPhase(hm, T).next.name, 'Build: 20 mi weeks');
assert.equal(currentPhase(hm, '2026-12-25'), null); // after every phase
assert.equal(currentPhase({ ...hm, path: [] }, T), null);

// measure: only exact unit matches count; phase target overrides
assert.deepStrictEqual(measureProgress(hmIdx, hm, T), { sum: 6, target: 15, unit: 'mi', per: 'week' });
assert.equal(measureProgress(hmIdx, hm, '2026-11-24').target, 20);
assert.equal(measureProgress(hmIdx, hm, '2026-12-25').target, 15); // no phase: falls back
assert.equal(measureProgress(hmIdx, { ...hm, measure: undefined }, T), null);
const doneTask = { id: 't', type: 'task', goalId: 'hm', title: 'Track', date: '2026-11-18', done: true, doneDate: '2026-11-18', amount: 2, unit: 'mi' };
assert.equal(measureProgress(index([...hmIdx.goals, ...hmIdx.habits, ...hmIdx.logs.values(), doneTask]), hm, T).sum, 8);
assert.equal(measureText({ sum: 6, target: 15, unit: 'mi', per: 'week' }), '6 of 15 mi this week');
assert.equal(measureText({ sum: 9, target: 22, unit: 'sessions', per: 'total' }), '9 of 22 sessions total');

// week dots and labels (week of Mon 11-16)
assert.deepStrictEqual(habitWeek(hmIdx, run, hm, T),
  { dots: ['done', 'done', 'off', 'due', 'off', 'due', 'off'], done: 2, due: 4, label: '2/4' });
assert.equal(habitWeek(hmIdx, longRun, hm, T).label, 'Sun');
assert.equal(habitWeek(hmIdx, { ...run, id: 'x', days: [4] }, hm, T).label, 'today');
assert.deepStrictEqual(habitWeek(hmIdx, lights, hm, T).dots, ['done', 'done', 'missed', 'due', 'due', 'due', 'due']);

// headline, bar, summary, labels
assert.deepStrictEqual(headline(hmIdx, hm, T), { value: '43', label: 'days to go' });
assert.equal(barFill(hmIdx, hm, T), 0.4);
assert.equal(summary(hmIdx, hm, T), 'Rebuild: 6 of 15 mi this week. Next up, Build: 20 mi weeks.');
assert.equal(dateLabel(hm, T), 'By Jan 1');
assert.equal(dateLabel({ ...hm, date: '2026-12-14', endDate: '2026-12-16' }, T), 'Dec 14 to 16');
assert.equal(sideBadge(hmIdx, hm, T), '43d');

// pct / status / reason / coach: one daily habit, window 11-05..11-18
const g = { id: 'g', type: 'goal', name: 'Lean and strong', title: 'Lean and strong', color: 'cyan', path: [], createdAt: '2026-11-01', note: 'Push, pull, legs.' };
const daily = { id: 'p', type: 'habit', goalId: 'g', title: '160 g protein', days: [0, 1, 2, 3, 4, 5, 6], startDate: '2026-11-01' };
const logged = (skip) => index([g, daily, ...span('2026-11-01', '2026-11-18').filter((d) => !skip.includes(d)).map((d) => log('p', d))]);
const on = logged(['2026-11-10', '2026-11-15']); // 12 of 14
const slip = logged(['2026-11-10', '2026-11-15', '2026-11-17', '2026-11-18']); // 10 of 14
assert.equal(goalPct(on, g, T), 86);
assert.equal(goalStatus(on, g, T), 'on');
assert.equal(goalStatus(slip, g, T), 'slipping');
assert.equal(goalStatus(on, { ...g, createdAt: '2026-11-15' }, T), 'new'); // under 7 days old
assert.equal(goalStatus(index([g]), g, T), 'new'); // no habits: pct null
assert.deepStrictEqual(headline(on, g, T), { value: '86%', label: 'daily work, 14 days' });
assert.deepStrictEqual(headline(on, { ...g, createdAt: T }, T), { value: '1', label: 'day in' });
assert.deepStrictEqual(headline(on, { ...g, createdAt: '2026-11-16' }, T), { value: '4', label: 'days in' });
assert.equal(barFill(on, g, T), 0.86);
assert.equal(summary(on, g, T), 'Push, pull, legs.');
assert.equal(dateLabel(g, T), 'Ongoing');
assert.equal(dateLabel({ ...g, createdAt: T }, T), 'Started today');
assert.equal(sideBadge(on, g, T), '');
assert.equal(sideBadge(on, { ...g, createdAt: T }, T), 'day 1');
assert.equal(goalReason(on, g, T), '160 g protein 12 of 14');
assert.equal(goalReason(slip, g, T), '160 g protein slips most');
assert.equal(goalReason(on, { ...g, createdAt: T }, T), 'Started today');
assert.equal(goalReason(on, { ...g, createdAt: '2026-11-16' }, T), 'Day 4');
// last 5 due instances 11-14..11-18: 15, 17, 18 missed
assert.equal(coachNote(slip, T), 'Lean and strong is slipping. 160 g protein missed 3 of the last 5 times it was due.');
assert.equal(coachNote(on, T), null);
assert.deepStrictEqual(activeGoals(index([g, { ...hm, archivedOn: '2026-11-10' }]), T).map((x) => x.id), ['g']);

console.log('goals.test.js: all assertions passed');
