// Dev-only sample data shaped like everyday-selection.pdf. Loaded with /?demo under
// `npm run dev`; App never persists or syncs it.
import { addDays } from './date.js';
import { logId } from './records.js';
import { habitDueOn } from './score.js';

const ALL = [0, 1, 2, 3, 4, 5, 6];

export function demoRecords(today) {
  let seed = 7;
  const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const D = (n) => addDays(today, n);
  const start = D(-150);
  const ts = 1;

  const goals = [
    {
      id: 'g-hm', name: 'Half marathon', title: 'Half marathon in under 2:00', color: 'orange',
      date: D(43), measure: { unit: 'mi', target: 15, per: 'week' }, stat: { value: '9:09', label: 'goal pace / mi' },
      createdAt: start,
      path: [
        { name: 'Rebuild: 10 to 15 mi weeks', start: D(-10), end: D(3), note: 'Easy miles only.', target: 15 },
        { name: 'Build: 20 mi weeks', start: D(4), end: D(17), note: 'Long run grows to 8 mi.', target: 20 },
        { name: 'Build: 25 mi weeks', start: D(18), end: D(31), note: 'Long run 10 mi, one at goal pace.', target: 25 },
        { name: 'Taper', start: D(32), end: D(42), note: 'Volume drops, legs come back.' },
        { name: 'Race', start: D(43), end: D(43), note: '13.1 mi at 9:09 per mile.' },
      ],
    },
    {
      id: 'g-fin', name: 'Fall finals', title: 'Finish fall finals strong', color: 'blue',
      date: D(25), endDate: D(27), measure: { unit: 'sessions', target: 22, per: 'total' },
      note: 'Review plan. LING first, then MATH, then CS.', createdAt: D(-21), path: [],
    },
    {
      id: 'g-lean', name: 'Lean and strong', title: 'Lean and strong', color: 'cyan',
      measure: { unit: 'lifts', target: 4, per: 'week' },
      note: 'Push, pull, legs, plus one upper day. Legs stay light while mileage builds.', createdAt: start, path: [],
    },
    {
      id: 'g-man', name: 'Mandarin', title: 'Learn Mandarin basics', color: 'purple', createdAt: today,
      path: [{ name: 'Phase 1: pinyin and tones', start: today, end: D(27), note: '15 minutes a day, every day.' }],
    },
  ].map((g) => ({ type: 'goal', updatedAt: ts, ...g }));

  // [id, goalId, title, days, time, amount, unit, note, miss rate]
  const habitRows = [
    ['h-run', 'g-hm', 'Easy run · 3 mi', [1, 2, 4, 6], '17:30', 3, 'mi', 'Zone 2, heart rate under 150.', 0.12],
    ['h-long', 'g-hm', 'Sunday long run', [0], '08:00', 5, 'mi', 'Conversational the whole way.', 0.1],
    ['h-lights', 'g-hm', 'Lights out by 11:30', ALL, '23:30', null, null, 'Sleep is what makes the long run feel easy.', 0.2],
    ['h-cs', 'g-fin', 'CS 1331 practice', ALL, '10:30', null, 'sessions', 'Timed and closed-notes.', 0.3],
    ['h-math', 'g-fin', 'MATH problem sets', [1, 3, 5], '13:00', null, 'sessions', 'Odd problems only.', 0.25],
    ['h-engl', 'g-fin', 'ENGL 1102 · Project 3', [1, 2, 4, 5], '20:00', null, null, 'Outline only.', 0.55],
    ['h-lift', 'g-lean', 'Lift 4× a week', [1, 2, 4, 6], '07:00', null, 'lifts', 'Push, pull, legs, upper.', 0.08],
    ['h-protein', 'g-lean', '160 g protein', ALL, null, null, null, null, 0.1],
    ['h-mob', 'g-lean', 'Mobility, 10 min', ALL, '07:50', null, null, null, 0.12],
    ['h-tones', 'g-man', 'Tones drill, 15 min', ALL, '21:00', null, null, 'Pinyin and the four tones.', 0],
    ['h-flash', 'g-man', 'Review flashcards', [5], null, null, null, null, 0],
  ];
  const goalById = new Map(goals.map((g) => [g.id, g]));
  const habits = habitRows.map(([id, goalId, title, days, time, amount, unit, note]) => {
    const h = { id, type: 'habit', goalId, title, days, startDate: goalById.get(goalId).createdAt, updatedAt: ts };
    if (time) h.time = time;
    if (amount) h.amount = amount;
    if (unit) h.unit = unit;
    if (note) h.note = note;
    return h;
  });

  // Logs through yesterday by miss rate; this morning's habits are already done today.
  const logs = [];
  const morning = new Set(['h-lift', 'h-mob', 'h-protein', 'h-cs']);
  habits.forEach((h, i) => {
    const miss = habitRows[i][8];
    const goal = goalById.get(h.goalId);
    for (let d = h.startDate; d <= today; d = addDays(d, 1)) {
      if (!habitDueOn(h, goal, d)) continue;
      if (d === today ? !morning.has(h.id) : rand() < miss) continue;
      const log = { id: logId(h.id, d), type: 'log', habitId: h.id, date: d, amount: h.amount ?? 1, updatedAt: ts };
      if (h.unit) log.unit = h.unit;
      logs.push(log);
    }
  });

  const tasks = [
    { id: 't-math', goalId: 'g-fin', title: 'MATH 1554 · Lay 6.2', note: 'Odd problems 1 to 17, orthogonal sets.', date: today, time: '13:00', done: true, doneDate: today },
    { id: 't-ta', goalId: 'g-fin', title: 'Email TA about review session', date: D(-1), done: false },
    { id: 't-laundry', title: 'Laundry', date: today, done: false },
  ].map((t) => ({ type: 'task', updatedAt: ts, ...t }));

  return [...goals, ...habits, ...logs, ...tasks];
}
