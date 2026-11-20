// Per-goal numbers and the copy built from them. Pure functions of (idx, goal, today).
import { addDays, daysBetween, weekStart } from './date.js';
import { logId } from './records.js';
import { habitDueOn, historyStart } from './score.js';
import { fmtDate, rangeLabel } from './words.js';

const ON_TRACK = 80;
const NEW_DAYS = 7;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const activeGoals = (idx) => idx.goals.filter((g) => !g.archivedOn);
const habitsOf = (idx, goal) => idx.habits.filter((h) => h.goalId === goal.id);

export function currentPhase(goal, today) {
  const i = (goal.path ?? []).findIndex((p) => p.start <= today && today <= p.end);
  return i < 0 ? null : { index: i, phase: goal.path[i], next: goal.path[i + 1] ?? null };
}

export function measureProgress(idx, goal, today) {
  const m = goal.measure;
  if (!m) return null;
  const target = currentPhase(goal, today)?.phase.target ?? m.target;
  const from = m.per === 'week' ? weekStart(today) : '';
  const inRange = (d) => d >= from && d <= today;
  const habitIds = new Set(habitsOf(idx, goal).map((h) => h.id));
  let sum = 0;
  for (const l of idx.logs.values())
    if (habitIds.has(l.habitId) && l.unit === m.unit && inRange(l.date)) sum += l.amount ?? 1;
  for (const t of idx.tasks)
    if (t.goalId === goal.id && t.done && t.unit === m.unit && inRange(t.date)) sum += t.amount ?? 1;
  return { sum, target, unit: m.unit, per: m.per };
}

export const measureText = (p) => `${p.sum} of ${p.target} ${p.unit} ${p.per === 'week' ? 'this week' : 'total'}`;

// The 14 days ending yesterday (today is still in progress).
export const goalWindow = (today) => [addDays(today, -14), addDays(today, -1)];

// Due and done instances of one habit across the window, clipped to the start of history.
function habitStats(idx, habit, goal, today) {
  const [from, to] = goalWindow(today);
  const start = historyStart(idx);
  const dueDates = [];
  const missed = new Set();
  for (let d = start && start > from ? start : from; start && d <= to; d = addDays(d, 1)) {
    if (!habitDueOn(habit, goal, d)) continue;
    dueDates.push(d);
    if (!idx.logs.has(logId(habit.id, d))) missed.add(d);
  }
  return { habit, due: dueDates.length, done: dueDates.length - missed.size, dueDates, missed };
}
const statsOf = (idx, goal, today) => habitsOf(idx, goal).map((h) => habitStats(idx, h, goal, today));
const pick = (list, key) => list.reduce((best, s) => (!best || key(s) > key(best) ? s : best), null);

export function goalPct(idx, goal, today) {
  const stats = statsOf(idx, goal, today);
  const due = stats.reduce((n, s) => n + s.due, 0);
  return due ? Math.round((100 * stats.reduce((n, s) => n + s.done, 0)) / due) : null;
}

export const ageDays = (goal, today) => daysBetween(goal.createdAt, today);

export function goalStatus(idx, goal, today) {
  const pct = goalPct(idx, goal, today);
  if (ageDays(goal, today) < NEW_DAYS || pct === null) return 'new';
  return pct >= ON_TRACK ? 'on' : 'slipping';
}

export function habitWeek(idx, habit, goal, today) {
  const mon = weekStart(today);
  const dots = [];
  let label = '';
  let pastDue = false;
  for (let i = 0; i < 7; i++) {
    const d = addDays(mon, i);
    if (!habitDueOn(habit, goal, d)) {
      dots.push('off');
      continue;
    }
    if (d < today) pastDue = true;
    if (!label && d >= today) label = d === today ? 'today' : WEEKDAYS[i === 6 ? 0 : i + 1];
    dots.push(idx.logs.has(logId(habit.id, d)) ? 'done' : d < today ? 'missed' : 'due');
  }
  const done = dots.filter((x) => x === 'done').length;
  const due = dots.filter((x) => x !== 'off').length;
  return { dots, done, due, label: pastDue ? `${done}/${due}` : label };
}

export function headline(idx, goal, today) {
  if (goal.date && today <= goal.date) return { value: String(daysBetween(today, goal.date)), label: 'days to go' };
  if (goalStatus(idx, goal, today) === 'new') {
    const n = ageDays(goal, today) + 1;
    return { value: String(n), label: n === 1 ? 'day in' : 'days in' };
  }
  return { value: `${goalPct(idx, goal, today) ?? 0}%`, label: 'daily work, 14 days' };
}

export function barFill(idx, goal, today) {
  const m = measureProgress(idx, goal, today);
  if (m) return m.target > 0 ? Math.min(1, m.sum / m.target) : 0;
  return (goalPct(idx, goal, today) ?? 0) / 100;
}

export function summary(idx, goal, today) {
  const cur = currentPhase(goal, today);
  const m = measureProgress(idx, goal, today);
  if (cur) {
    const head = m ? `${cur.phase.name}: ${measureText(m)}.` : `${cur.phase.name}.`;
    return cur.next ? `${head} Next up, ${cur.next.name}.` : head;
  }
  if (goal.note) return goal.note;
  return m ? `${measureText(m)}.` : '';
}

export function dateLabel(goal, today) {
  if (goal.date && goal.endDate) return rangeLabel(goal.date, goal.endDate);
  if (goal.date) return `By ${fmtDate(goal.date)}`;
  return ageDays(goal, today) === 0 ? 'Started today' : 'Ongoing';
}

export function goalReason(idx, goal, today) {
  const status = goalStatus(idx, goal, today);
  if (status === 'new') {
    const age = ageDays(goal, today);
    return age === 0 ? 'Started today' : `Day ${age + 1}`;
  }
  const stats = statsOf(idx, goal, today);
  if (!stats.length) return '';
  if (status === 'slipping') return `${pick(stats, (s) => s.due - s.done).habit.title} slips most`;
  const s = pick(stats, (x) => x.due);
  return `${s.habit.title} ${s.done} of ${s.due}`;
}

// One rule-based nudge: the worst slipping goal and its most-missed habit.
export function coachNote(idx, today) {
  const slipping = activeGoals(idx).filter((g) => goalStatus(idx, g, today) === 'slipping');
  const goal = pick(slipping, (g) => -goalPct(idx, g, today));
  if (!goal) return null;
  const worst = pick(statsOf(idx, goal, today), (s) => s.due - s.done);
  const recent = worst ? worst.dueDates.slice(-5) : [];
  const k = recent.filter((d) => worst.missed.has(d)).length;
  if (!k) return `${goal.name} is slipping.`;
  return `${goal.name} is slipping. ${worst.habit.title} missed ${k} of the last ${recent.length} times it was due.`;
}

export function sideBadge(idx, goal, today) {
  if (goal.date && today <= goal.date) return `${daysBetween(today, goal.date)}d`;
  if (goalStatus(idx, goal, today) === 'new') return `day ${ageDays(goal, today) + 1}`;
  return '';
}
