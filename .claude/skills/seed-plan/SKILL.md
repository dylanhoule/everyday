---
name: seed-plan
description: >-
  Seed a new AI-generated markdown plan into the everyday app and stage it for deploy.
  Use when the user says "seed a plan", "push a new plan", "/seed-plan <file>", "load this
  plan into the app", or hands over a markdown daily-task plan like excersiceplan.md.
  Regenerates src/plan.js, runs tests, and commits locally — it does NOT push (the user
  pushes to master to trigger the Vercel production deploy).
---

# seed-plan

Turn a markdown daily-task plan into the app's seeded plan data, ready for the user to
push. New plans **add alongside** whatever is already in the app; this skill **commits
locally and stops before pushing**.

## Pipeline (why these steps)

```
<plan>.md → myplan.md → node scripts/gen-plan.mjs → src/plan.js (PLAN + PLAN_VERSION)
          → npm test → git commit (local) → user pushes → Vercel deploys prod
```

`gen-plan.mjs` reads the daily-plan tables; `App.jsx` re-seeds today-or-future tasks
whenever `PLAN_VERSION` changes (dedup by id, so existing tasks are untouched).

## Steps

1. **Get the path.** The plan file path is the skill argument (e.g. `/seed-plan ./newplan.md`).
   If none was given, ask for it. Error out if the file doesn't exist. Run everything from
   the repo root (`/Users/dylanhoule/projects/everyday`).

2. **Validate the format** before touching anything (see **Format** below). Quick checks:
   - `grep -q 'Plan start:.*[0-9]\{4\}' <file>` — needs a start year.
   - `grep -qE '^\|\s*\**(Mon|Tue|Wed|Thu|Fri|Sat|Sun) [0-9]{2}/[0-9]{2}' <file>` — needs
     weekday daily rows.
   If either fails, tell the user exactly what's missing (per **Format**) and stop.

3. **Copy** the file to the repo root as `myplan.md` (the tracked source `gen-plan.mjs`
   defaults to). This un-deletes it if it was removed.

4. **Regenerate:** `npm run gen-plan` (or `node scripts/gen-plan.mjs`). It rewrites
   `src/plan.js` with correct years and a fresh `PLAN_VERSION`, and prints the task count
   and version.

5. **Test:** `npm test`. If it fails, show the output and **stop** — do not commit.

6. **Summarize** so the user can eyeball it: task count, date range (first → last), and
   2–3 sample task lines. One-liner to get the range + count:
   ```
   node -e "import('./src/plan.js').then(m=>{const d=m.PLAN.map(t=>t.date).sort();console.log(m.PLAN.length,'tasks',d[0],'→',d.at(-1),'v'+m.PLAN_VERSION)})"
   ```

7. **Commit locally (do NOT push):**
   ```
   git add myplan.md src/plan.js
   git commit -m "seed plan: <first>–<last> (<N> tasks)"
   ```
   Only add files that actually changed. End the commit message with the required trailer:
   `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

8. **Hand off.** Show `git diff --stat HEAD~1` (or the commit) and tell the user:
   > Committed locally. Run `git push origin master` to deploy to production (Vercel).
   Push only if they explicitly say to.

9. **Behavior note for the user:** on the next app load the new plan's today-or-future
   tasks append; existing tasks and manual todos are preserved (`PLAN_VERSION` bumped, so
   it re-seeds exactly once).

## Format the plan must follow

The generator only reads weekday rows of daily tables; all other tables/prose are ignored.
A compatible plan needs:

- A `**Plan start:** … <YYYY>` line — any text on that line containing the 4-digit start
  year. The year rolls forward automatically each time the month wraps (rows must be
  chronological).
- Daily tables `| Day | Session | Miles | Detail |`:
  - **Day**: starts with a 3-letter weekday + `MM/DD`, e.g. `Mon 07/20` (bold is fine).
  - **Miles**: a bare integer → a `🏃` run task (`🏁` if the Session contains `RACE:`);
    `–` (or non-numeric) → no run task.
  - **Detail**: a plain note becomes the run's `· …` suffix; a
    `**Strength X – …** [Blk N]: a; b. Core: c; d` block becomes one `💪` task per exercise.

See `excersiceplan.md` for a full reference example.
