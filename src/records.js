// Record helpers: legacy migration, ids, blank records for the editors.
import { merge, purge, retireStale } from './merge.js';
import { addDays } from './date.js';

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

// Merge a pulled blob into local records. The remote is migrated first, so junk in it
// (null, non-objects, id-less entries, old-shape todos) never reaches merge().
export const syncMerge = (cur, remote, now = Date.now()) => purge(migrate(merge(cur, migrate(remote, now)), now), now);

// Key-order-insensitive JSON, for "did this record change?"
const canon = (v) =>
  JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort()) : x));

// Records in `list` that are new or differ from their copy in `before`. Saving only these keeps
// an untouched record's updatedAt, so it can't overwrite an edit made on another device.
export function changedOnly(before, list) {
  const prev = new Map(before.map((r) => [r.id, canon(r)]));
  return list.filter((r) => prev.get(r.id) !== canon(r));
}

// A new path phase: the day after the last phase ends (today if that end is unset), two weeks long.
export function nextPhase(path, today) {
  const lastEnd = path.at(-1)?.end;
  const start = lastEnd ? addDays(lastEnd, 1) : today;
  return { name: '', start, end: addDays(start, 13) };
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
