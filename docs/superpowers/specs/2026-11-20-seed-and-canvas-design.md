# everyday: seeding goals from a plan, and a Canvas "Due soon" panel

Builds on the goal hub (`docs/superpowers/specs/2026-11-20-goal-hub-design.md`), on branch `goal-hub`.

## Intent

Two ways to get real information into everyday without typing it on a phone:

1. **Seeding.** The user describes a plan to Claude in this repo; Claude turns it into goals, habits, phases, and tasks; the user pushes; the app picks it up.
2. **Canvas panel.** The user's Canvas assignments (already subscribed in their Google Calendar) show in a separate read-only "Due soon" panel, apart from goals.

## Goals

- Seed one or more goals (with habits, phases, measure, tasks) from a written plan, end to end in a Claude Code session plus one push.
- Re-seeding a goal replaces its seeded content; dropped seeded habits end (history kept); in-app edits to a goal hold until that goal is seeded again; seeding goal B never touches goal A.
- See the next 14 days of Canvas assignments and events, grouped by day, with course code, on Today (desktop right column under the Today list; phone at the bottom of Today).

## Non-goals

- Writing to Canvas or Google Calendar. No Google sign-in or Google Calendar API.
- Submission status (the feed doesn't carry it). Past-due items simply drop off.
- Turning Canvas items into tasks or tying them to goals. The panel never touches score, streak, or goal numbers. (A one-tap "plan it" can come later.)
- An in-app import box, or a script that writes to the live sync store.
- Seeding deleting anything. Seeds add, update, and end seeded habits only.

## Anti-goals

- The feed link or sync passphrase in the repo, the client bundle, or Claude's hands. The user sets `CANVAS_ICS_URL` in Vercel themselves.
- A late or stale device re-applying an old seed over edits made elsewhere.
- The panel nagging: no red, no "overdue".

## Constraints

- Everything from the goal hub spec: no new runtime dependencies, records in the one synced array merged by `merge.js`, local `YYYY-MM-DD` dates via `date.js`, no em dashes, `node:assert` tests in `npm test`.
- Vercel serverless functions in `api/`; files starting with `_` there are not routes.
- The ICS feed is fetched server-side (browsers can't fetch Canvas directly: CORS) and gated by the same `x-sync-key` check as `api/todos.js`.

## Approaches

**Seeding** (Claude's call; user handed over the how):
- **Seed batches in the bundle, applied after a pull, marked in synced data** (picked). No secrets on this machine; same push-to-deploy flow the user already used; exactly-once across devices.
- A terminal script PUTting into the sync store: instant, but needs the passphrase locally and edits live data from the terminal.
- In-app paste import: no deploy, but copy-paste on a phone.

**Calendar** (Claude's call):
- **Canvas ICS feed via a Vercel function, hand-written parser** (picked). Freshest data, no OAuth, no dependency.
- Google Calendar's secret iCal address: same mechanism, but Google's copy of a subscribed calendar lags by up to a day.
- Google Calendar API with OAuth: Cloud project, consent screen, token storage, all to read one feed.

## Seeding design

**`src/seed.js`** exports `SEEDS`: an array of batches, `{ id: '2026-11-21-finals', records: [...] }`. Records use the goal hub shapes with stable ids:
- goal `seed:<goal-slug>`, habit `seed:<goal-slug>:<habit-slug>`, task `seed:<goal-slug>:t:<task-slug>`.
- Starts as `export const SEEDS = [];`. Old batches may be deleted from the file at any time once applied.

**Applying** (pure function, `applySeeds(records, seeds, today, now) -> records` in `src/records.js`):
- A batch is pending when no live record `{ id: 'seedmark:<batch.id>', type: 'seedmark' }` exists. Pending batches apply in array order; each adds its seedmark (`updatedAt: now`), which syncs like any record, so the batch applies once across all devices.
- Each seed record is upserted with `updatedAt: now`, except:
  - an existing goal keeps its `createdAt`; an existing habit keeps its `startDate` (history continuity);
  - an existing task keeps `done` and `doneDate`.
  - a seeded goal that was archived is un-archived (the plan says it's active).
  - **In-app removals win** (Claude's call): a seed record whose existing copy is tombstoned, or a habit whose existing copy has ended (`endDate < today`), is skipped, never revived. Reviving would rewrite history (the ended stretch would turn into misses). To bring one back, the skill adds it under a new slug.
  - **No backdating** (Claude's call): a *new* goal's `createdAt` or a *new* habit's `startDate` that is before the apply day moves up to the apply day. Batches can apply days after they're written, and seeds carry no logs, so a past start could only add misses. Task dates and path phases stay as written.
- For each goal in the batch: its live habits whose id starts with `seed:` and that are not in the batch are ended (same rule as `removeHabit`: `endDate` yesterday, or tombstoned if started today). Habits the user added in-app (UUID ids) and other goals' records are untouched.
- **When it runs:** in `App.jsx`, right after a successful pull merge (`syncMerge`), never at load from local data alone, so a device that hasn't pulled yet can't re-apply over newer edits. A device with no sync at all (the passphrase prompt was dismissed and nothing is stored) applies locally at that point instead; it never applies at load, because a new device that is about to get a passphrase would otherwise apply old batches before its first pull.

**Skill `.claude/skills/seed-goals/SKILL.md`** (triggers: "seed goals", "seed a plan", "/seed-goals", "load this plan"):
1. Read the user's plan. Ask only for what can't be inferred and changes the records (a goal's date, which weekdays a habit runs). Otherwise fill sensible defaults and list them.
2. Append a new batch to `SEEDS` (id `YYYY-MM-DD-<slug>`), using stable `seed:` ids; re-seeding a goal reuses its slug.
3. `npm test` (includes a seed validity test, below). Stop on failure.
4. Summarize: goals, habits with days/times, phases, tasks, and every default filled in.
5. Commit locally; tell the user to push to deploy and open the app once online. Never push.

**Seed validity test** (`src/seed.test.js`, plan-agnostic like the old `plan.test.js`): every batch id unique and dated; every record has a `seed:` id, a known type, and the fields the goal hub needs (goal: `name`, `title`, `color`, `createdAt`, `path` array with valid phases; habit: `goalId` of a goal in the same batch or an earlier one, non-empty `days`, `startDate`; task: `title`, `date`); no duplicate ids within a batch.

## Canvas panel design

**Server: `api/calendar.js`** (GET only)
- Same passphrase check as `api/todos.js` (move `authed` into `api/_auth.js`, used by both).
- `CANVAS_ICS_URL` unset: `404 { error: 'not configured' }`. Feed fetch fails: `502`.
- Fetch the feed, parse, return `{ events }`: events whose start is between now minus 1 day and now plus 15 days (the client trims to local days), sorted by start.
- No server cache; the client throttles.

**Parser: `src/ics.js`**, `parseICS(text) -> Event[]`, pure and tested; imported by the function.
- Unfold lines (CRLF or LF followed by space or tab), split `BEGIN:VEVENT` ... `END:VEVENT`.
- Fields: `UID`, `SUMMARY`, `DTSTART`, `URL` (fallback: first `https://` link in `DESCRIPTION`).
- `DTSTART;VALUE=DATE:20261214` is all-day: `{ allDay: true, date: '2026-12-14' }`. `DTSTART:20261215T045900Z` is a UTC instant: `{ allDay: false, start: '2026-12-15T04:59:00Z' }`. Other forms (floating or `TZID=`) are read as the wall time in that string with no zone conversion. (Canvas emits the first two; known ceiling, `ponytail:` comment.)
- Unescape `\n`, `\,`, `\;`, `\\` in text.
- Course: a trailing `[...]` in `SUMMARY` becomes `course` and is stripped from `title` (Canvas puts the course code there, e.g. "Project 3 [ENGL-1102]").
- Event: `{ uid, title, course?, allDay, date? , start?, url? }`.

**Client: `src/canvas.js`**
- `fetchCanvas()` GETs `/api/calendar` with the stored passphrase; caches `{ at, events }` in localStorage `canvasCache`; refetches only if the cache is older than 15 minutes; called on open and on focus/visibility next to sync. `404` means "not configured": cache that and hide the panel. Any other failure keeps showing the last cache.
- In demo mode, returns a fixed fixture instead of fetching.

**UI: `src/DuePanel.jsx`**
- Title `Due soon` with a small `Canvas` label. Lists events whose local date is today through today + 13, grouped by local day: `Today`, `Tomorrow`, else `Tue Nov 24`. Row: title, course, and time (`fmtTime` of the local time, or `all day`). Timed events whose start has passed today drop off. Rows link to `url` (new tab) when present.
- Empty: `Nothing due in the next two weeks.` Not configured: panel hidden.
- Placement: desktop, inside the Today column under the item list (before the coach note); phone, at the end of Today.
- Purely presentational: no checkboxes, never in score or goal numbers.

**User setup** (documented in the skill-free README note in the final message, not done by Claude): Canvas, Calendar, "Calendar Feed", copy the link; Vercel project settings, Environment Variables, add `CANVAS_ICS_URL` for Production; redeploy.

## Tests

- `src/ics.test.js`: folded lines, all-day vs UTC events, escaped text, course extraction, missing URL with a link in DESCRIPTION, non-VEVENT blocks ignored, garbage input returns `[]`.
- `src/records.test.js` additions for `applySeeds`: applies once and writes a seedmark; second call is a no-op; keeps `createdAt`/`startDate`/task `done`; ends a seeded habit dropped from a later batch for the same goal; leaves an in-app habit and another goal's records alone; un-archives a re-seeded goal.
- `src/seed.test.js`: validity of whatever `SEEDS` holds (passes when empty).
- Grouping/windowing logic for the panel lives in a pure `dueGroups(events, today, nowMs)` in `src/canvas.js`, tested in `src/canvas.test.js` (local-day grouping, 14-day window, past timed events today dropped, all-day today kept).

## Left to the builder

File layout inside these modules, panel styling (match the goal hub's list rows, muted course label), demo fixture contents, exact error copy beyond what's above.
