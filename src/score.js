// Day-level numbers: what's due, what's done, day score, streaks, history cells.
// Everything is derived from the live records on each call; nothing is stored.
import { addDays, weekday } from './date.js';
import { logId } from './records.js';

const STREAK_BAR = 70; // a day at 70%+ counts toward the streak

// Live records grouped by type. Build once per render (App memoizes it).
export function index(records) {
  const idx = { goals: [], goalById: new Map(), habits: [], tasks: [], logs: new Map(), tasksByDate: new Map() };
  for (const r of records) {
    if (r.deleted) continue;
    if (r.type === 'goal') idx.goals.push(r);
    else if (r.type === 'habit') idx.habits.push(r);
    else if (r.type === 'task') {
      idx.tasks.push(r);
      if (!idx.tasksByDate.has(r.date)) idx.tasksByDate.set(r.date, []);
      idx.tasksByDate.get(r.date).push(r);
    } else if (r.type === 'log') idx.logs.set(r.id, r);
  }
  idx.goals.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  for (const g of idx.goals) idx.goalById.set(g.id, g);
  return idx;
}

export const lastDay = (goal) => goal.endDate ?? goal.date ?? null;

// ponytail: past days use the habit's current weekdays, so editing days in place rewrites
// its history. Ending a habit (endDate) preserves it. Snapshot per-day due counts if that bites.
export function habitDueOn(habit, goal, date) {
  if (!goal) return false;
  if (date < habit.startDate) return false;
  if (habit.endDate && date > habit.endDate) return false;
  if (goal.archivedOn && date >= goal.archivedOn) return false;
  const last = lastDay(goal);
  if (last && date > last) return false;
  return habit.days.includes(weekday(date));
}

// A task counts for its own date if it was finished by the end of the next day.
const taskDoneFor = (t) => !!(t.done && t.doneDate && t.doneDate <= addDays(t.date, 1));

export function itemsOn(idx, date) {
  const items = [];
  for (const h of idx.habits) {
    const goal = idx.goalById.get(h.goalId);
    if (!habitDueOn(h, goal, date)) continue;
    const log = idx.logs.get(logId(h.id, date));
    items.push({
      kind: 'habit', id: h.id, date, title: h.title, note: h.note, time: h.time, goal, done: !!log,
      amount: log?.amount ?? h.amount ?? 1, unit: log ? log.unit : h.unit, rec: h,
    });
  }
  for (const t of idx.tasksByDate.get(date) ?? []) {
    items.push({
      kind: 'task', id: t.id, date, title: t.title, note: t.note, time: t.time,
      goal: idx.goalById.get(t.goalId) ?? null, done: taskDoneFor(t), amount: t.amount ?? 1, unit: t.unit, rec: t,
    });
  }
  const kindRank = { habit: 0, task: 1 };
  return items.sort(
    (a, b) =>
      (a.time ? 0 : 1) - (b.time ? 0 : 1) ||
      (a.time ?? '').localeCompare(b.time ?? '') ||
      kindRank[a.kind] - kindRank[b.kind] ||
      a.title.localeCompare(b.title)
  );
}

// What Today's Earlier group lists: older tasks still undone or finished while open (so a
// mis-tap can be undone), then all of yesterday's items, done or not.
export function earlierItems(idx, today) {
  const yesterday = addDays(today, -1);
  const older = idx.tasks
    .filter((t) => t.date < yesterday && (!t.done || (t.doneDate && t.doneDate >= yesterday)))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => ({ ...itemsOn(idx, t.date).find((i) => i.kind === 'task' && i.id === t.id), done: !!t.done }));
  return [...older, ...itemsOn(idx, yesterday)];
}

export function dayScore(idx, date) {
  const items = itemsOn(idx, date);
  if (!items.length) return null;
  return Math.round((100 * items.filter((i) => i.done).length) / items.length);
}

export const isLocked = (date, today) => date < addDays(today, -1);

export const toKeep = (due, done) => Math.max(0, Math.ceil((STREAK_BAR / 100) * due) - done);

export const historyStart = (idx) => idx.goals[0]?.createdAt ?? null; // goals are sorted by createdAt

export function streaks(idx, today) {
  const start = historyStart(idx);
  let run = 0;
  let runStart = null;
  let best = null;
  const close = (end) => {
    if (run > 0 && (!best || run > best.len)) best = { len: run, start: runStart, end };
  };
  let lastCounted = null;
  for (let d = start; d && d <= today; d = addDays(d, 1)) {
    const s = dayScore(idx, d);
    if (s === null) continue; // rest day
    if (s >= STREAK_BAR) {
      if (run === 0) runStart = d;
      run += 1;
      lastCounted = d;
    } else if (isLocked(d, today)) {
      close(lastCounted);
      run = 0;
    } // open day below the bar: still in play, skip
  }
  close(lastCounted);
  return { current: run, best };
}

export function dayCell(idx, date, today) {
  const start = historyStart(idx);
  if (!start || date < start || date > today) return { kind: 'none' };
  const score = dayScore(idx, date);
  return score === null ? { kind: 'rest' } : { kind: 'score', score };
}

// Mean day score over the n days ending yesterday, and the n days before that.
export function rangeAverage(idx, today, n) {
  const start = historyStart(idx);
  const avg = (from, to) => {
    const scores = [];
    for (let d = from; d <= to; d = addDays(d, 1)) {
      if (!start || d < start) continue;
      const s = dayScore(idx, d);
      if (s !== null) scores.push(s);
    }
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  };
  return { avg: avg(addDays(today, -n), addDays(today, -1)), prev: avg(addDays(today, -2 * n), addDays(today, -n - 1)) };
}
