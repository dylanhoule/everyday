---
name: seed-goals
description: >-
  Turn a plan into everyday goals, habits, phases, and tasks by adding a seed batch to
  src/seed.js. Use when the user says "seed goals", "seed a plan", "/seed-goals", "load this
  plan", "add these goals", or describes goals/habits they want loaded into the app. Tests and
  commits locally on master; it does NOT push (the user pushes to deploy).
---

# seed-goals

The app applies each batch in `src/seed.js` once, right after a device's first successful
sync pull, and marks it applied in the synced data (`src/records.js` `applySeeds`). Read the
top of `src/seed.js` and the record shapes below before writing anything.

## Steps

1. **Branch check.** Run `git branch --show-current`. If it is not `master`, stop and tell the
   user; seeds only reach the phone from master.
2. **Read the plan.** Ask only for what can't be inferred and would change the records: a
   goal's date or range, which weekdays a habit runs, a measure's unit/target. Otherwise fill
   the defaults below and list every default in step 5.
3. **Append ONE new batch** to `SEEDS`, id `YYYY-MM-DD-<slug>` (today's date). Never edit an
   applied batch in place. To re-seed a goal, add a new batch that reuses its slug and lists
   the goal's full current habit set (seeded habits missing from it get ended).
4. **Test:** `npm test`. `seed.test.js` runs `seedErrors(SEEDS)`; fix anything it reports. Stop
   if anything else fails.
5. **Summarize** for the user: each goal (date, measure, phases), each habit (days, time,
   amount/unit), each task (date), and every default you filled in.
6. **Commit locally:** `git add src/seed.js && git commit -m "seed: <batch id>"`. Never push.
   Tell the user: push master to deploy, then open the app once while online; the first
   device that syncs applies the batch and the others follow.

## Ids

- goal `seed:<goal-slug>`, habit `seed:<goal-slug>:<habit-slug>`, task `seed:<goal-slug>:t:<task-slug>`
- Slugs are lowercase words joined by hyphens. Reuse a goal's slug to update it.
- Something the user removed in the app (ended habit, deleted task) is never revived by a
  seed. To bring it back, give it a NEW slug.
- To remove seeded habits, re-seed their goal (goal record included) without them; they end,
  history kept. To remove a seeded task, list it again in the new batch with `deleted: true`.

## Record shapes

```js
// goal
{ id, type: 'goal', name /* short: "Half marathon" */, title /* "Half marathon in under 2:00" */,
  color /* orange | blue | cyan | purple | green | pink */,
  date?, endDate? /* YYYY-MM-DD; countdown targets date; endDate makes a range */,
  note?, measure?: { unit, target, per: 'week' | 'total' },
  stat?: { value, label }, path: [{ name, start, end, note?, target? }],
  createdAt /* YYYY-MM-DD */ }
// habit (recurring)
{ id, type: 'habit', goalId, title, note?, time? /* 'HH:MM', absent = all day */,
  days /* weekdays, 0 = Sun ... 6 = Sat */, amount?, unit?, startDate }
// task (one-off)
{ id, type: 'task', goalId?, title, note?, date, time?, amount?, unit?, done: false }
```

## Defaults

- `color`: the next palette color not used by an existing seeded goal in `SEEDS`, in palette order.
- `createdAt` / `startDate`: today (the app moves past dates up to the apply day anyway).
- Habit `days`: all seven when the plan doesn't say. No `time` means all day.
- `path: []` when the plan has no phases. A phase `target` overrides `measure.target` while it runs.

## Gotchas

- A habit or task counts toward a goal's measure only when its `unit` exactly equals
  `measure.unit` (e.g. both `"mi"`). Habits without a unit count toward nothing.
- Goals are New for 7 days, then On track at 80%+ of habit check-offs over 14 days.
- No em dashes anywhere (user preference).
