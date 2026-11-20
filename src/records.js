// Record helpers: legacy migration, ids, blank records for the editors.
import { retireStale } from './merge.js';

export const newId = () => crypto.randomUUID();
export const logId = (habitId, date) => `log:${habitId}:${date}`;

// Old todos ({id, text, done, date, doneDate}) become tasks. Typed records pass through.
// Undone tasks from the deleted training plan are tombstoned (the sync store may still
// hold them). Idempotent, so it runs on every load and every pull.
export function migrate(list, now = Date.now()) {
  const out = [];
  for (const r of list) {
    if (!r || typeof r.id !== 'string') continue;
    if (r.type) {
      out.push(r);
      continue;
    }
    const [title, ...rest] = String(r.text ?? '').split('\n');
    const t = { id: r.id, type: 'task', title, date: r.date, done: !!r.done, updatedAt: r.updatedAt ?? 0 };
    if (rest.length) t.note = rest.join('\n');
    if (r.doneDate) t.doneDate = r.doneDate;
    if (r.deleted) t.deleted = r.deleted;
    out.push(t);
  }
  return retireStale(out, new Set(), now);
}

export const blankGoal = (today) => ({
  id: newId(),
  type: 'goal',
  name: '',
  title: '',
  color: 'orange',
  path: [],
  createdAt: today,
});

export function blankHabit(goal, today) {
  const h = { id: newId(), type: 'habit', goalId: goal.id, title: '', days: [0, 1, 2, 3, 4, 5, 6], startDate: today };
  if (goal.measure) h.unit = goal.measure.unit;
  return h;
}

export function blankTask(today, goalId) {
  const t = { id: newId(), type: 'task', title: '', date: today, done: false };
  if (goalId) t.goalId = goalId;
  return t;
}
