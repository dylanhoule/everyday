import assert from 'node:assert';
import { migrate, logId, blankHabit, blankTask, blankGoal, syncMerge, changedOnly, nextPhase, applySeeds, seedErrors, syncStep } from './records.js';

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

// applySeeds: batches apply once, keep history and in-app state, never revive removals
{
  const T = '2026-11-20';
  const goal = { id: 'seed:fin', type: 'goal', name: 'Fall finals', title: 'Finish fall finals strong', color: 'blue', date: '2026-12-14', path: [], createdAt: T };
  const cs = { id: 'seed:fin:cs', type: 'habit', goalId: 'seed:fin', title: 'CS practice', days: [1, 3, 5], startDate: T };
  const math = { id: 'seed:fin:math', type: 'habit', goalId: 'seed:fin', title: 'MATH sets', days: [2, 4], startDate: T };
  const outline = { id: 'seed:fin:t:outline', type: 'task', goalId: 'seed:fin', title: 'ENGL outline', date: '2026-11-22', done: false };
  const b1 = { id: '2026-11-20-finals', records: [goal, cs, math, outline] };

  const r = applySeeds([], [b1], T, 100);
  assert.deepStrictEqual(r.map((x) => x.id).sort(), ['seed:fin', 'seed:fin:cs', 'seed:fin:math', 'seed:fin:t:outline', 'seedmark:2026-11-20-finals']);
  assert.ok(r.every((x) => x.updatedAt === 100));
  assert.strictEqual(applySeeds(r, [b1], T, 200), r); // already applied: same array back

  const later = '2026-11-27';
  let edited = r.map((x) => (x.id === outline.id ? { ...x, done: true, doneDate: '2026-11-22' } : x.id === goal.id ? { ...x, archivedOn: '2026-11-25' } : x));
  edited = [...edited,
    { id: 'uuid-1', type: 'habit', goalId: 'seed:fin', title: 'My own', days: [0], startDate: T, updatedAt: 150 },
    { id: 'other', type: 'goal', name: 'Other', title: 'O', color: 'pink', path: [], createdAt: T, updatedAt: 150 }];
  const b2 = { id: '2026-11-27-finals', records: [
    { ...goal, title: 'Finals v2', createdAt: later }, { ...cs, startDate: later, days: [1, 2, 3, 4, 5] }, { ...outline, title: 'ENGL outline v2' }] };
  const by = Object.fromEntries(applySeeds(edited, [b1, b2], later, 300).map((x) => [x.id, x]));
  assert.equal(by['seed:fin'].title, 'Finals v2');
  assert.equal(by['seed:fin'].createdAt, T); // history start kept
  assert.equal(by['seed:fin'].archivedOn, '2026-11-25'); // archive wins: re-seeding never turns the archived stretch into misses
  assert.equal(by['seed:fin:cs'].startDate, T);
  assert.deepStrictEqual(by['seed:fin:cs'].days, [1, 2, 3, 4, 5]);
  assert.equal(by['seed:fin:math'].endDate, '2026-11-26'); // dropped seeded habit ended, not deleted
  assert.equal(by['seed:fin:t:outline'].title, 'ENGL outline v2');
  assert.equal(by['seed:fin:t:outline'].done, true); // completion kept
  assert.equal(by['seed:fin:t:outline'].doneDate, '2026-11-22');
  assert.equal(by['uuid-1'].updatedAt, 150); // in-app habit untouched
  assert.equal(by.other.updatedAt, 150); // other goal untouched
  assert.ok(by['seedmark:2026-11-27-finals']);

  // in-app removals win; no backdating of new goals/habits
  const removed = applySeeds(
    r.map((x) => (x.id === math.id ? { ...x, endDate: '2026-11-22' } : x.id === outline.id ? { ...x, deleted: true } : x)),
    [b1, { id: '2026-11-27-again', records: [goal, math, outline, { ...cs, id: 'seed:fin:new', startDate: T }, { ...goal, id: 'seed:new', createdAt: T }] }],
    later, 400);
  const rb = Object.fromEntries(removed.map((x) => [x.id, x]));
  assert.equal(rb['seed:fin:math'].endDate, '2026-11-22'); // ended habit not revived
  assert.equal(rb['seed:fin:t:outline'].deleted, true); // deleted task not revived
  assert.equal(rb['seed:fin:new'].startDate, later); // new habit starts on the apply day
  assert.equal(rb['seed:new'].createdAt, later); // new goal too

  // syncStep: a device without sync applies seeds stamped 0, so any synced edit wins later
  const remote = r.map((x) => (x.id === goal.id ? { ...x, title: 'Edited elsewhere', updatedAt: 500 } : x.id === outline.id ? { ...x, deleted: true, updatedAt: 500 } : x));
  const offline = syncStep([], null, [b1], { hasKey: false, today: later, now: 900 });
  assert.ok(offline.some((x) => x.id === 'seedmark:2026-11-20-finals'));
  const joined = Object.fromEntries(syncStep(offline, remote, [b1], { hasKey: true, today: later, now: 1000 }).map((x) => [x.id, x]));
  assert.equal(joined['seed:fin'].title, 'Edited elsewhere');
  assert.equal(joined['seed:fin:t:outline'].deleted, true);
  assert.deepStrictEqual(syncStep(r, null, [b1], { hasKey: true, today: later, now: 1 }), r); // key stored, pull failed: untouched
  assert.equal(syncStep([], remote, [b1], { hasKey: true, today: later, now: 1000 }).length, remote.length); // already marked remotely

  assert.deepStrictEqual(seedErrors([b1, b2]), []);
  const bad = seedErrors([
    { id: 'nodate', records: [{ ...cs, id: 'seed:x:h', goalId: 'seed:typo' }, { ...goal, id: 'plain-id' }] },
    { id: '2026-11-20-finals', records: [{ ...cs, days: [] }] },
  ]);
  assert.ok(bad.some((e) => e.includes('nodate'))); // batch id must be dated
  assert.ok(bad.some((e) => e.includes('seed:typo'))); // unknown goal
  assert.ok(bad.some((e) => e.includes('plain-id'))); // ids must start with seed:
  assert.ok(bad.some((e) => e.includes('days'))); // habit needs days
}

console.log('records.test.js: all assertions passed');
