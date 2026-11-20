// Every mutation, as a pure function of the records array. A refused change returns the
// input array itself. Days older than yesterday are locked (one-day grace).
import { addDays } from './date.js';
import { logId } from './records.js';
import { isLocked } from './score.js';

const patch = (records, id, fn) => records.map((r) => (r.id === id ? fn(r) : r));

export function upsert(records, rec, now) {
  const next = { ...rec, updatedAt: now };
  return records.some((r) => r.id === rec.id) ? patch(records, rec.id, () => next) : [next, ...records];
}

export function toggleHabit(records, habit, date, today, now) {
  if (isLocked(date, today)) return records;
  const id = logId(habit.id, date);
  const existing = records.find((r) => r.id === id);
  if (existing && !existing.deleted) return patch(records, id, (r) => ({ ...r, deleted: true, updatedAt: now }));
  const log = { id, type: 'log', habitId: habit.id, date, amount: habit.amount ?? 1, updatedAt: now };
  if (habit.unit) log.unit = habit.unit;
  return existing ? patch(records, id, () => log) : [log, ...records];
}

export function toggleTask(records, taskId, today, now) {
  const t = records.find((r) => r.id === taskId);
  if (!t) return records;
  if (t.done) {
    if (isLocked(t.doneDate, today)) return records;
    return patch(records, taskId, ({ doneDate, ...r }) => ({ ...r, done: false, updatedAt: now }));
  }
  return patch(records, taskId, (r) => ({ ...r, done: true, doneDate: today, updatedAt: now }));
}

export function setAmount(records, id, amount, today, now) {
  const r = records.find((x) => x.id === id);
  if (!r || r.deleted) return records;
  const day = r.type === 'log' ? r.date : r.done ? r.doneDate : null;
  if (!day || isLocked(day, today)) return records;
  return patch(records, id, (x) => ({ ...x, amount, updatedAt: now }));
}

export const archiveGoal = (records, goalId, today, now) =>
  patch(records, goalId, (r) => ({ ...r, archivedOn: today, updatedAt: now }));

// Ending keeps the habit's history; one made today has none, so it's simply deleted.
export function removeHabit(records, habitId, today, now) {
  const endDate = addDays(today, -1);
  return patch(records, habitId, (r) =>
    r.startDate > endDate ? { ...r, deleted: true, updatedAt: now } : { ...r, endDate, updatedAt: now }
  );
}

export const deleteTask = (records, taskId, now) =>
  patch(records, taskId, (r) => ({ ...r, deleted: true, updatedAt: now }));
