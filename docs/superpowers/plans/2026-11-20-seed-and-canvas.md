# Seed Goals + Canvas Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Claude seed goals into everyday from a written plan, and show the user's Canvas assignments in a separate read-only "Due soon" panel.

**Architecture:** Seeds are batches of goal-hub records in `src/seed.js`, applied by a pure `applySeeds` right after a sync pull and marked done with a synced `seedmark` record so each batch applies once across devices. Canvas data comes from the Canvas ICS feed through a passphrase-gated Vercel function (`api/calendar.js`) using a hand-written parser (`src/ics.js`); the client caches it and renders a presentational `DuePanel`.

**Tech Stack:** React 19, Vite 8, Vercel Node functions, Upstash (unchanged). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-20-seed-and-canvas-design.md` (builds on `docs/superpowers/specs/2026-11-20-goal-hub-design.md`).

## Global Constraints

- No em dashes in code, comments, copy, commits, or docs.
- No new runtime dependencies.
- Local `YYYY-MM-DD` dates via `src/date.js`; never `toISOString()` for a day.
- Records keep the goal-hub shapes; every record has `id`, `type`, `updatedAt`; tombstones, never hard deletes.
- `CANVAS_ICS_URL` and the sync passphrase never appear in the repo or the client bundle; `/api/calendar` uses the same `x-sync-key` check as `/api/todos`.
- The Canvas panel never affects score, streak, or goal numbers.
- Tests are `node:assert` scripts in `npm test`; work continues on branch `goal-hub`; commit per task; never push.

## Review Focus

1. **A device that hasn't pulled yet** (offline, or stale local data) must not apply a seed at load and overwrite edits made elsewhere. (Covered by applying only after a pull; manual check in Task 5.)
2. **A huge or hostile feed** (thousands of past events, missing `END:VEVENT`, binary junk): the parser must not throw and the function must return a bounded list. (Test in Task 1.)
3. **Time zones:** a Canvas due time of 11:59 PM local arrives as next-day UTC (`T045900Z`); it must show on the local due day, not the next. (Test in Task 2.)
4. **Passphrase missing or wrong** on `/api/calendar`: 401, and the panel quietly keeps its cache instead of erroring. (Task 3 check + Task 4 behavior.)
5. **A seed referencing a goal that doesn't exist** (typo in `goalId`) must fail `npm test`, not ship. (Test in Task 5.)

---

## File map

| File | Responsibility |
|---|---|
| `src/ics.js` | `parseICS`, `upcoming` (pure) |
| `src/canvas.js` | `dueGroups` (pure), `readCanvas`, `fetchCanvas` (client cache + fetch) |
| `api/_auth.js` | shared passphrase check (moved out of `api/todos.js`) |
| `api/calendar.js` | GET feed, parse, return upcoming events |
| `src/DuePanel.jsx` | the panel |
| `src/records.js` | add `applySeeds`, `seedErrors` |
| `src/seed.js` | `SEEDS` batches (starts empty) |
| `.claude/skills/seed-goals/SKILL.md` | the seeding workflow |
| `src/sync.js` | add non-prompting `storedKey()` |
| `src/App.jsx`, `src/Today.jsx`, `src/demo.js`, `src/index.css` | wiring, demo fixture, styles |

Event shape (used by every task):
`{ uid, title, course?, allDay: boolean, date? /* 'YYYY-MM-DD' when allDay */, start? /* ISO string when timed; 'Z' suffix = UTC, none = local wall time */, url? }`

---

### Task 1: ICS parser

**Files:** Create `src/ics.js`, `src/ics.test.js`; modify `package.json` (append `&& node src/ics.test.js`).

**Interfaces:**
- Produces: `parseICS(text: string) -> Event[]`; `upcoming(events: Event[], nowMs: number, days = 15) -> Event[]` (start within `[now - 1 day, now + days]`, sorted by start, capped at 200).
- `eventMs(e) -> number`: `Date.parse(e.start)` for timed, `Date.parse(e.date + 'T00:00:00')` for all-day (exported, used by `upcoming`).

- [ ] **Step 1: Write the failing test** `src/ics.test.js`

```js
import assert from 'node:assert';
import { parseICS, upcoming } from './ics.js';

const feed = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VTIMEZONE',
  'TZID:America/New_York',
  'END:VTIMEZONE',
  'BEGIN:VEVENT',
  'UID:event-assignment-1',
  'DTSTART:20261215T045900Z',
  'SUMMARY:Project 3 outline [ENGL-1102-A]',
  'URL;VALUE=URI:https://canvas.example.edu/courses/1/assignments/2',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:event-2',
  'DTSTART;VALUE=DATE:20261214',
  'SUMMARY:Final exam\\, LING [LING-2001]',
  'DESCRIPTION:See https://canvas.example.edu/courses/9/calendar_events/5 for d',
  ' etails\\nRoom 101',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:event-3',
  'DTSTART;TZID=America/New_York:20261216T090000',
  'SUMMARY:Office hours',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

assert.deepStrictEqual(parseICS(feed), [
  { uid: 'event-assignment-1', title: 'Project 3 outline', course: 'ENGL-1102-A', allDay: false,
    start: '2026-12-15T04:59:00Z', url: 'https://canvas.example.edu/courses/1/assignments/2' },
  { uid: 'event-2', title: 'Final exam, LING', course: 'LING-2001', allDay: true, date: '2026-12-14',
    url: 'https://canvas.example.edu/courses/9/calendar_events/5' },
  { uid: 'event-3', title: 'Office hours', allDay: false, start: '2026-12-16T09:00:00' },
]);
assert.equal(parseICS(feed.replace(/\r\n/g, '\n')).length, 3); // LF-only feeds too
assert.deepStrictEqual(parseICS(''), []);
assert.deepStrictEqual(parseICS('not a calendar'), []);
assert.deepStrictEqual(parseICS(undefined), []);
assert.deepStrictEqual(parseICS('BEGIN:VEVENT\nUID:x\nSUMMARY:no start\nEND:VEVENT'), []); // no DTSTART: skipped
assert.deepStrictEqual(parseICS('BEGIN:VEVENT\nUID:y\nDTSTART:20261201T100000Z\nSUMMARY:cut off'), []); // unterminated

const now = Date.parse('2026-12-10T12:00:00Z');
const old = { uid: 'old', title: 'Old', allDay: true, date: '2026-11-01' };
const far = { uid: 'far', title: 'Far', allDay: true, date: '2027-01-30' };
assert.deepStrictEqual(upcoming([far, ...parseICS(feed), old], now).map((e) => e.uid), ['event-2', 'event-assignment-1', 'event-3']);
const many = Array.from({ length: 500 }, (_, i) => ({ uid: `m${i}`, title: 'M', allDay: true, date: '2026-12-11' }));
assert.equal(upcoming(many, now).length, 200);

console.log('ics.test.js: all assertions passed');
```

- [ ] **Step 2: Run to verify it fails**

Run: `node src/ics.test.js` -> FAIL (module not found).

- [ ] **Step 3: Implement `src/ics.js`**

Rules the tests don't determine: unfold with `text.replace(/\r?\n[ \t]/g, '')`, then split lines on `/\r?\n/`. A property line is `NAME[;PARAMS]:VALUE` split at the first `:`; `NAME` is upper-cased, `PARAMS` checked for `VALUE=DATE`. Unescape text values: `\\n`/`\\N` -> newline, `\\,` -> `,`, `\\;` -> `;`, `\\\\` -> `\`. `DTSTART` value `YYYYMMDD` -> all-day `date`; `YYYYMMDDTHHMMSS[Z]` -> `start` `YYYY-MM-DDTHH:MM:SS[Z]`; anything else: skip the event. `TZID` is ignored (wall time kept as written; add a `ponytail:` comment: no zone conversion for TZID, Canvas emits UTC). Course: `/\s*\[([^\]]+)\]\s*$/` on the summary. URL: `URL` property, else the first `/https?:\/\/[^\s]+/` match in the unescaped `DESCRIPTION`. Omit `course`/`url` keys when absent. Wrap the whole parse in `try` and return `[]` on any throw. `upcoming` keeps events with `now - 86400000 <= eventMs <= now + days * 86400000`, sorts by `eventMs`, then `slice(0, 200)`.

- [ ] **Step 4: Run to verify it passes**

Run: `npm test` -> every file prints "all assertions passed".

- [ ] **Step 5: Commit**

```bash
git add src/ics.js src/ics.test.js package.json
git commit -m "Add Canvas ICS parser"
```

---

### Task 2: Panel grouping and client cache (`src/canvas.js`)

**Files:** Create `src/canvas.js`, `src/canvas.test.js`; modify `src/sync.js` (add `storedKey`), `package.json` (append test).

**Interfaces:**
- Consumes: `Event` from Task 1; `iso`, `addDays`, `dayParts` from `date.js`; `fmtDate` from `words.js`.
- Produces:
  - `dueGroups(events, today, nowMs) -> [{ date, label, events: [{ ...event, time: 'HH:MM' | null }] }]`: local date of each event (all-day: `date`; timed: `iso(new Date(start))`), window `today .. today + 13`, timed events with `Date.parse(start) < nowMs` dropped, groups in date order, events within a group by time with all-day last, then title. Labels: `Today`, `Tomorrow`, else `${weekday short} ${fmtDate(date)}` (e.g. `Tue Nov 24`).
  - `readCanvas() -> { at, status: 'ok' | 'off', events } | null` from localStorage `canvasCache` (try/catch, null on error).
  - `fetchCanvas(force = false) -> Promise<cache | null>`: returns the cache without fetching when it is younger than 15 minutes (unless `force`); with no `storedKey()` returns the cache; GET `/api/calendar` with `x-sync-key`; `200` -> `{ at: Date.now(), status: 'ok', events }`; `404` -> `{ at, status: 'off', events: [] }`; anything else or a network error -> the old cache unchanged. Writes successful results to `canvasCache`.
  - `storedKey() -> string | null` in `src/sync.js`: the saved passphrase without prompting.

- [ ] **Step 1: Write the failing test** `src/canvas.test.js`

```js
import assert from 'node:assert';
import { dueGroups } from './canvas.js';

const T = '2026-11-20'; // Friday
const now = new Date(2026, 10, 20, 12, 0).getTime(); // local noon
const at = (d, h, m) => new Date(2026, 10, d, h, m).toISOString(); // a local time as a UTC ISO string
const ev = (uid, title, extra) => ({ uid, title, ...extra });

const groups = dueGroups([
  ev('a', 'Done this morning', { allDay: false, start: at(20, 9, 0) }),
  ev('b', 'Late', { allDay: false, start: at(20, 23, 59) }),
  ev('c', 'All day today', { allDay: true, date: '2026-11-20' }),
  ev('d', 'Morning', { allDay: false, start: at(21, 8, 0) }),
  ev('e', 'Quiz', { allDay: true, date: '2026-11-24' }),
  ev('f', 'Too far', { allDay: true, date: '2026-12-04' }), // today + 14
  ev('g', 'Yesterday', { allDay: true, date: '2026-11-19' }),
], T, now);

assert.deepStrictEqual(groups.map((g) => [g.date, g.label, g.events.map((e) => [e.title, e.time])]), [
  ['2026-11-20', 'Today', [['Late', '23:59'], ['All day today', null]]],
  ['2026-11-21', 'Tomorrow', [['Morning', '08:00']]],
  ['2026-11-24', 'Tue Nov 24', [['Quiz', null]]],
]);
// 11:59 PM local on the 24th, written the way Canvas sends it (UTC): stays on the 24th
assert.equal(dueGroups([ev('z', 'Essay', { allDay: false, start: at(24, 23, 59) })], T, now)[0].date, '2026-11-24');
assert.deepStrictEqual(dueGroups([], T, now), []);

console.log('canvas.test.js: all assertions passed');
```

- [ ] **Step 2: Run to verify it fails** — `node src/canvas.test.js` -> FAIL (module not found).

- [ ] **Step 3: Implement `src/canvas.js` and `storedKey`** per the interfaces above. `canvas.js` must not touch `localStorage` or `fetch` at import time (the test runs in Node).

- [ ] **Step 4: Run to verify it passes** — `npm test` -> all pass.

- [ ] **Step 5: Commit**

```bash
git add src/canvas.js src/canvas.test.js src/sync.js package.json
git commit -m "Add Canvas panel grouping and client cache"
```

---

### Task 3: Calendar function

**Files:** Create `api/_auth.js`, `api/calendar.js`; modify `api/todos.js` (import `authed` from `./_auth.js`, delete its local copy).

**Interfaces:**
- Consumes: `parseICS`, `upcoming` from `../src/ics.js`.
- Produces: `authed(req) -> boolean` (moved verbatim); `GET /api/calendar` -> `200 { events }` | `401 { error: 'bad key' }` | `404 { error: 'not configured' }` | `405` | `502 { error: 'feed unavailable' }`.

- [ ] **Step 1: Implement** `api/_auth.js`, `api/calendar.js`, and the `todos.js` import change. `calendar.js` fetches `process.env.CANVAS_ICS_URL` with a 10 s `AbortSignal.timeout`, treats non-OK as 502, returns `upcoming(parseICS(text), Date.now())`. Header comment explains where the URL comes from (Canvas, Calendar, Calendar Feed) and that it is a private link.

- [ ] **Step 2: Verify with a local feed** (scratch script in the session scratchpad, not committed): start a `node:http` server on a free port serving the Task 1 fixture feed with event dates moved to the next few days; set `SYNC_SECRET=test` and `CANVAS_ICS_URL=http://127.0.0.1:<port>/feed.ics`; import the handler and call it with fake `req`/`res` objects.
Expected: correct key -> 200 with 3 events; wrong key -> 401; `CANVAS_ICS_URL` unset -> 404; server returning 500 -> 502; POST -> 405. Also `npm test` still passes and `npm run build` succeeds.

- [ ] **Step 3: Commit**

```bash
git add api/_auth.js api/calendar.js api/todos.js
git commit -m "Add passphrase-gated Canvas calendar endpoint"
```

---

### Task 4: Due soon panel

**Files:** Create `src/DuePanel.jsx`; modify `src/App.jsx`, `src/Today.jsx`, `src/demo.js`, `src/index.css`.

**Interfaces:**
- Consumes: `dueGroups`, `readCanvas`, `fetchCanvas` (Task 2); `fmtTime` (`words.js`).
- Produces: `api.canvas` (the cache object or `null`); `demoCanvas(today) -> { at, status: 'ok', events }` in `demo.js`; `DuePanel({ api })`.

- [ ] **Step 1: Build it**
  - `App.jsx`: `const [canvas, setCanvas] = useState(readCanvas)`; in the existing `sync` callback also run `fetchCanvas().then((c) => c && setCanvas(c))` (demo mode: `setCanvas(demoCanvas(today))` once, no fetch); expose `api.canvas`.
  - `DuePanel`: hidden when `!api.canvas` or `status === 'off'`. Header `Due soon` + muted `Canvas`. Groups from `dueGroups(canvas.events, today, Date.now())`: day label, then rows of title, muted course, and `fmtTime(time)` (`all day` when null). Row is an `<a target="_blank" rel="noreferrer">` when `url` exists, else a `<div>`. Empty: `Nothing due in the next two weeks.`
  - `Today.jsx`: desktop, inside the Today column after the item list and before the coach card; phone, after everything else.
  - `demoCanvas`: five or six events over the next ten days, courses like `ENGL-1102`, `MATH-1554`, `CS-1331`, one all-day, one tonight at 23:59.
  - Styles: rows like `.item` but no checkbox; course in muted small text.

- [ ] **Step 2: Verify**
Run: `npm test && npm run build` -> passes.
Manual (`npm run dev`, `/?demo`, 390px and 1440px frames): panel shows under the Today list (desktop) and at the end of Today (phone), grouped `Today` / `Tomorrow` / `Tue Nov 24`; the day score and streak are unchanged by it. Without `?demo` and with no `canvasCache`, no panel and no console errors (the dev server has no `/api/calendar`, so the fetch fails quietly).

- [ ] **Step 3: Commit**

```bash
git add src
git commit -m "Add Canvas Due soon panel"
```

---

### Task 5: Seeding

**Files:** Create `src/seed.js`, `src/seed.test.js`, `.claude/skills/seed-goals/SKILL.md`; modify `src/records.js`, `src/records.test.js`, `src/App.jsx`, `package.json` (append `&& node src/seed.test.js`).

**Interfaces:**
- Consumes: `removeHabit`-style ending (reuse the rule; `actions.js` `removeHabit` may be imported), `upsert` from `actions.js`.
- Produces:
  - `SEEDS: { id: string, records: record[] }[]` in `src/seed.js` (starts `[]`).
  - `applySeeds(records, seeds, today, now) -> records` (returns the input array itself when no batch is pending).
  - `seedErrors(seeds) -> string[]` (empty when valid).

- [ ] **Step 1: Write the failing tests** (append to `src/records.test.js`; create `src/seed.test.js`)

```js
// records.test.js additions (extend the import with applySeeds, seedErrors)
{
  const T = '2026-11-20';
  const goal = { id: 'seed:fin', type: 'goal', name: 'Fall finals', title: 'Finish fall finals strong', color: 'blue', date: '2026-12-14', path: [], createdAt: T };
  const cs = { id: 'seed:fin:cs', type: 'habit', goalId: 'seed:fin', title: 'CS practice', days: [1, 3, 5], startDate: T };
  const math = { id: 'seed:fin:math', type: 'habit', goalId: 'seed:fin', title: 'MATH sets', days: [2, 4], startDate: T };
  const outline = { id: 'seed:fin:t:outline', type: 'task', goalId: 'seed:fin', title: 'ENGL outline', date: '2026-11-22', done: false };
  const b1 = { id: '2026-11-20-finals', records: [goal, cs, math, outline] };

  const r = applySeeds([], [b1], T, 100);
  assert.deepStrictEqual(r.map((x) => x.id).sort(), ['seed:fin', 'seed:fin:cs', 'seed:fin:math', 'seed:fin:t:outline', 'seedmark:2026-11-20-finals']);
  assert.ok(r.every((x) => x.updatedAt === 100));
  assert.strictEqual(applySeeds(r, [b1], T, 200), r); // already applied: same array back

  const later = '2026-11-27';
  let edited = r.map((x) => (x.id === outline.id ? { ...x, done: true, doneDate: '2026-11-22' } : x.id === goal.id ? { ...x, archivedOn: '2026-11-25' } : x));
  edited = [...edited,
    { id: 'uuid-1', type: 'habit', goalId: 'seed:fin', title: 'My own', days: [0], startDate: T, updatedAt: 150 },
    { id: 'other', type: 'goal', name: 'Other', title: 'O', color: 'pink', path: [], createdAt: T, updatedAt: 150 }];
  const b2 = { id: '2026-11-27-finals', records: [
    { ...goal, title: 'Finals v2', createdAt: later }, { ...cs, startDate: later, days: [1, 2, 3, 4, 5] }, { ...outline, title: 'ENGL outline v2' }] };
  const by = Object.fromEntries(applySeeds(edited, [b1, b2], later, 300).map((x) => [x.id, x]));
  assert.equal(by['seed:fin'].title, 'Finals v2');
  assert.equal(by['seed:fin'].createdAt, T);                 // history start kept
  assert.equal('archivedOn' in by['seed:fin'], false);       // re-seeded goal is active again
  assert.equal(by['seed:fin:cs'].startDate, T);
  assert.deepStrictEqual(by['seed:fin:cs'].days, [1, 2, 3, 4, 5]);
  assert.equal(by['seed:fin:math'].endDate, '2026-11-26');   // dropped seeded habit ended, not deleted
  assert.equal(by['seed:fin:t:outline'].title, 'ENGL outline v2');
  assert.equal(by['seed:fin:t:outline'].done, true);         // completion kept
  assert.equal(by['seed:fin:t:outline'].doneDate, '2026-11-22');
  assert.equal(by['uuid-1'].updatedAt, 150);                  // in-app habit untouched
  assert.equal(by.other.updatedAt, 150);                      // other goal untouched
  assert.ok(by['seedmark:2026-11-27-finals']);

  // in-app removals win; no backdating of new goals/habits
  const removed = applySeeds(
    [...r.map((x) => (x.id === math.id ? { ...x, endDate: '2026-11-22' } : x.id === outline.id ? { ...x, deleted: true } : x))],
    [b1, { id: '2026-11-27-again', records: [goal, math, outline, { ...cs, id: 'seed:fin:new', startDate: T }, { ...goal, id: 'seed:new', createdAt: T }] }],
    later, 400);
  const rb = Object.fromEntries(removed.map((x) => [x.id, x]));
  assert.equal(rb['seed:fin:math'].endDate, '2026-11-22');    // ended habit not revived
  assert.equal(rb['seed:fin:t:outline'].deleted, true);       // deleted task not revived
  assert.equal(rb['seed:fin:new'].startDate, later);          // new habit starts on the apply day
  assert.equal(rb['seed:new'].createdAt, later);              // new goal too

  assert.deepStrictEqual(seedErrors([b1, b2]), []);
  const bad = seedErrors([
    { id: 'nodate', records: [{ ...cs, id: 'seed:x:h', goalId: 'seed:typo' }, { ...goal, id: 'plain-id' }] },
    { id: '2026-11-20-finals', records: [{ ...cs, days: [] }] },
  ]);
  assert.ok(bad.some((e) => e.includes('nodate')));          // batch id must be dated
  assert.ok(bad.some((e) => e.includes('seed:typo')));       // unknown goal
  assert.ok(bad.some((e) => e.includes('plain-id')));        // ids must start with seed:
  assert.ok(bad.some((e) => e.includes('days')));            // habit needs days
}
```

`src/seed.test.js`:

```js
import assert from 'node:assert';
import { SEEDS } from './seed.js';
import { seedErrors } from './records.js';
assert.deepStrictEqual(seedErrors(SEEDS), []);
console.log(`seed.test.js: all assertions passed (${SEEDS.length} batches)`);
```

- [ ] **Step 2: Run to verify they fail** — `npm test` -> FAIL (`applySeeds` not exported).

- [ ] **Step 3: Implement**
  - `applySeeds`: for each batch in order whose `seedmark:<id>` is not a live record: for each seed record, look up the existing record by id (tombstones included); skip it if that copy is tombstoned or is a habit with `endDate < today`; if there is no existing copy, raise a past goal `createdAt` / habit `startDate` to `today`; build `next = { ...seed }`; if existing: goals keep `createdAt` (and drop `archivedOn`), habits keep `startDate`, tasks keep `done`/`doneDate` (omit `doneDate` key if existing had none); upsert with `updatedAt: now`. Then, for each goal id in the batch, end live habits with that `goalId`, an id starting `seed:`, no `endDate` (or `endDate >= today`), and not in the batch (`removeHabit` rule). Finally add `{ id: 'seedmark:<id>', type: 'seedmark', updatedAt: now }`. Return the input array when nothing was pending.
  - `seedErrors`: batch id matches `/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/` and is unique; record ids start `seed:` and are unique per batch; type in `goal|habit|task`; goal: `name`, `title`, `color` in the six-color palette, `createdAt` date, `path` array of phases with `name`, `start <= end`; habit: `goalId` of a goal in this or an earlier batch, `days` non-empty subset of 0..6, `startDate` date, `title`; task: `title`, `date`. Each message names the batch id and record id.
  - `src/seed.js`: header comment (how batches work, ids, never edit old batches in place, safe to delete applied ones) and `export const SEEDS = [];`.
  - `App.jsx`: in `sync()`, after a successful pull, `setRecords((cur) => applySeeds(syncMerge(cur, remote), SEEDS, todayIso(), Date.now()))`; when `pull()` returned null **and** `storedKey()` is still null afterwards (prompt dismissed, no sync), `setRecords((cur) => applySeeds(cur, SEEDS, todayIso(), Date.now()))`. Never in `load()`. Skipped in demo mode.
  - `.claude/skills/seed-goals/SKILL.md`: frontmatter name/description (triggers: "seed goals", "seed a plan", "/seed-goals", "load this plan", "add these goals"); body = the five steps from the spec's skill section, the record shapes (copy the "Record shapes" block from the goal-hub plan), id rules (`seed:<goal-slug>`, `seed:<goal-slug>:<habit-slug>`, `seed:<goal-slug>:t:<task-slug>`; reuse a goal's slug to re-seed it), defaults (color: next unused in palette order; `createdAt`/`startDate`: today; habit `days`: all seven when unstated; no `time` = all day), a "measures need an exact unit match" reminder, a branch check (commit only on `master`; if on another branch, stop and tell the user), and "never push; tell the user to push and open the app once online".

- [ ] **Step 4: Run to verify they pass** — `npm test` -> all pass; `npm run build` succeeds.

- [ ] **Step 5: Manual check (Review Focus 1)** with a temporary batch in `src/seed.js` (reverted before commit): `/?demo` is unaffected; in a dev frame without demo and with `syncKey` set (pull fails on the dev server), the seed is **not** applied; with no `syncKey` (stub `window.prompt` to return null), it is applied once and a reload does not apply it twice.

- [ ] **Step 6: Commit**

```bash
git add src/seed.js src/seed.test.js src/records.js src/records.test.js src/App.jsx package.json .claude/skills/seed-goals/SKILL.md
git commit -m "Seed goals from a plan via batches applied after sync"
```

---

### Task 6: Final pass

- [ ] `git diff fe1bd08..HEAD -U0 -- . ':!docs/superpowers/plans' | grep '^+' | grep -c '—'` prints `0`.
- [ ] `npm test && npm run build` pass.
- [ ] Commit any fixes (`git commit -am "Seed and Canvas cleanup"`).
- [ ] After the final review: merge `goal-hub` into `master` locally (user's decision), run `npm test && npm run build` on the merged result, delete the `goal-hub` branch. Do not push.
