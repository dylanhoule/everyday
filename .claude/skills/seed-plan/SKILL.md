---
name: seed-plan
description: >-
  Reseed the everyday app's daily plan from NEWPLAN.md. Use when the user says "seed a plan",
  "push a new plan", "/seed-plan", "load this plan into the app", or asks to change the
  training/nutrition schedule. Regenerates src/plan.js, runs tests, and commits locally — it
  does NOT push (the user pushes to master to trigger the Vercel production deploy).
---

# seed-plan

The app's plan is generated **programmatically**, not parsed from markdown. `NEWPLAN.md` is
the human-readable source of truth; `scripts/gen-plan.mjs` holds the machine-readable mirror
of it (weekly template + phase/nutrition/rotation tables) and expands it across dates.

## Pipeline

```
NEWPLAN.md ──(mirrored by hand)──> scripts/gen-plan.mjs
  → npm run gen-plan → src/plan.js (PLAN + PLAN_VERSION)
  → npm test → git commit (local) → user pushes → Vercel deploys prod
```

`App.jsx` `load()` seeds today-or-future tasks whenever `PLAN_VERSION` changes, then calls
`retireStale(todos, new Set(PLAN.map(p => p.id)))` to tombstone anything the previous plan
left behind. **Done tasks and manual todos always survive** — only undone `plan-*` ids that
the new plan doesn't contain get retired.

## Steps

1. **Edit `NEWPLAN.md` first** (it's what the user reads), then mirror the change into the
   corresponding table in `scripts/gen-plan.mjs`. Run everything from the repo root
   (`/Users/dylanhoule/projects/everyday`).

2. **Regenerate:** `npm run gen-plan`. Rewrites `src/plan.js` and prints task count + version.

3. **Test:** `npm test`. If it fails, show the output and **stop** — do not commit.

4. **Summarize** so the user can eyeball it: task count, date range, and a sample day.
   ```
   node -e "import('./src/plan.js').then(m=>{const d=m.PLAN.map(t=>t.date).sort();console.log(m.PLAN.length,'tasks',d[0],'→',d.at(-1),'v'+m.PLAN_VERSION)})"
   ```
   Worth spot-checking after any schedule edit: weekly mileage sums, phase boundary dates,
   cutback weeks, and that every date in the range is present.

5. **Commit locally (do NOT push):**
   ```
   git add NEWPLAN.md scripts/gen-plan.mjs src/plan.js
   git commit -m "seed plan: <first>–<last> (<N> tasks)"
   ```
   Only add files that actually changed. End the commit message with the required trailer:
   `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.

6. **Hand off.** Show `git diff --stat HEAD~1` and tell the user:
   > Committed locally. Run `git push origin master` to deploy to production (Vercel).

   Push only if they explicitly say to.

## Task shape

Four fields, one per line in `src/plan.js`:

```js
{"id":"plan-2026-08-10-lift","text":"💪 Pull A — …","done":false,"date":"2026-08-10"}
```

Id kinds are validated by `src/plan.test.js`: `run` · `lift` · `fuel` · `weigh` ·
`strength-<n>` · `task`. **One id per date per kind** — adding a second task of the same kind
on a day needs a new suffix, plus a regex update in `plan.test.js`.

Emoji convention: `🏃` run · `🏁` race · `💪` lift · `🍽` nutrition · `⚖️` weigh-in · `📌` other.
