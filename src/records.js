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

// ---- Seeding (see src/seed.js and .claude/skills/seed-goals) ----

const PALETTE = ['orange', 'blue', 'cyan', 'purple', 'green', 'pink'];
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

// Apply every seed batch not yet marked as applied. A batch writes its records, ends the
// seeded habits its goals no longer list, and leaves a synced `seedmark` so no device
// applies it twice. Existing goals keep createdAt (and come back from archive), habits keep
// startDate, tasks keep done/doneDate. Records removed in the app (tombstoned, or habits
// already ended) are never revived; new goals/habits never start before the apply day.
// Returns the input array itself when nothing was pending.
export function applySeeds(records, seeds, today, now) {
  let out = records;
  const yesterday = addDays(today, -1);
  for (const batch of seeds) {
    const mark = `seedmark:${batch.id}`;
    if (out.some((r) => r.id === mark && !r.deleted)) continue;
    const byId = new Map(out.map((r) => [r.id, r]));
    const put = (rec) => {
      const next = { ...rec, updatedAt: now };
      out = byId.has(rec.id) ? out.map((r) => (r.id === rec.id ? next : r)) : [next, ...out];
      byId.set(rec.id, next);
    };
    const inBatch = new Set(batch.records.map((r) => r.id));
    for (const seed of batch.records) {
      const old = byId.get(seed.id);
      if (old?.deleted || (old?.type === 'habit' && old.endDate && old.endDate < today)) continue;
      const next = { ...seed };
      if (old && seed.type === 'goal') {
        next.createdAt = old.createdAt;
        if (old.archivedOn) next.archivedOn = old.archivedOn; // archive wins, like other in-app removals
      }
      if (old && seed.type === 'habit') next.startDate = old.startDate;
      if (old && seed.type === 'task') {
        next.done = !!old.done;
        if (old.doneDate) next.doneDate = old.doneDate;
        else delete next.doneDate;
      }
      if (!old && seed.type === 'goal' && next.createdAt < today) next.createdAt = today;
      if (!old && seed.type === 'habit' && next.startDate < today) next.startDate = today;
      put(next);
    }
    for (const goal of batch.records.filter((r) => r.type === 'goal')) {
      const dropped = out.filter(
        (r) => r.type === 'habit' && r.goalId === goal.id && r.id.startsWith('seed:') && !r.deleted &&
          !inBatch.has(r.id) && (!r.endDate || r.endDate >= today)
      );
      for (const h of dropped) put(h.startDate > yesterday ? { ...h, deleted: true } : { ...h, endDate: yesterday });
    }
    put({ id: mark, type: 'seedmark' });
  }
  return out;
}

// One sync round for seeds. After a real pull, merge then apply pending batches. With no sync at
// all (no passphrase stored), apply locally stamped 0 so any synced copy of those records wins
// if this device joins sync later. A stored key with a failed pull: change nothing.
export function syncStep(cur, remote, seeds, { hasKey, today, now }) {
  if (remote) return applySeeds(syncMerge(cur, remote, now), seeds, today, now);
  return hasKey ? cur : applySeeds(cur, seeds, today, 0);
}

// Everything wrong with a SEEDS array, one message per problem (empty = valid).
export function seedErrors(seeds) {
  const errs = [];
  const batchIds = new Set();
  const goals = new Set();
  for (const b of seeds ?? []) {
    const at = `batch ${b?.id}`;
    if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(b?.id ?? '')) errs.push(`${at}: id must look like YYYY-MM-DD-slug`);
    if (batchIds.has(b?.id)) errs.push(`${at}: duplicate batch id`);
    batchIds.add(b?.id);
    const records = Array.isArray(b?.records) ? b.records : [];
    for (const r of records) if (r?.type === 'goal') goals.add(r.id);
    const ids = new Set();
    for (const r of records) {
      const where = `${at} ${r?.id}`;
      if (typeof r?.id !== 'string' || !r.id.startsWith('seed:')) errs.push(`${where}: id must start with seed:`);
      if (ids.has(r?.id)) errs.push(`${where}: duplicate id`);
      ids.add(r?.id);
      if (r?.type === 'goal') {
        if (!r.name || !r.title) errs.push(`${where}: goal needs name and title`);
        if (!PALETTE.includes(r.color)) errs.push(`${where}: color must be one of ${PALETTE.join(', ')}`);
        if (!isDate(r.createdAt)) errs.push(`${where}: createdAt must be YYYY-MM-DD`);
        if (!Array.isArray(r.path)) errs.push(`${where}: path must be a list`);
        for (const p of r.path ?? [])
          if (!p?.name || !isDate(p.start) || !isDate(p.end) || p.start > p.end) errs.push(`${where}: phase "${p?.name}" needs a name and start <= end`);
      } else if (r?.type === 'habit') {
        if (!r.title) errs.push(`${where}: habit needs a title`);
        if (!goals.has(r.goalId)) errs.push(`${where}: unknown goal ${r.goalId}`);
        if (!Array.isArray(r.days) || !r.days.length || r.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6))
          errs.push(`${where}: days must be a non-empty list of 0-6 (0 = Sun)`);
        if (!isDate(r.startDate)) errs.push(`${where}: startDate must be YYYY-MM-DD`);
      } else if (r?.type === 'task') {
        if (!r.title) errs.push(`${where}: task needs a title`);
        if (!isDate(r.date)) errs.push(`${where}: date must be YYYY-MM-DD`);
        if (r.goalId && !goals.has(r.goalId)) errs.push(`${where}: unknown goal ${r.goalId}`);
      } else errs.push(`${where}: type must be goal, habit, or task`);
    }
  }
  return errs;
}
