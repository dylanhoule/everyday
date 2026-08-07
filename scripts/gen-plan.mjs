// Generator: expands NEWPLAN.md's weekly template into dated tasks in src/plan.js.
// NEWPLAN.md is the human-readable source of truth; the tables below mirror it.
// Re-run with `npm run gen-plan` after editing either.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const START = '2026-08-10'; // Monday
const P1_WEEKS = 12; // Phase 1 cut: Aug 10 → Nov 1
const P2_WEEKS = 52; // Phase 2 lean gain: Nov 2 → Oct 31 2027
const DIET_BREAK_WEEK = 6; // NEWPLAN: "at week 6, eat at maintenance for one full week"
const MAINTENANCE = '2,780 kcal · 165g P';

const LIFTS = {
  Mon: 'Pull A — Weighted pull-up 5x4-6 · Barbell row 4x6-8 · Chest-supported T-bar row 3x10-12 · Barbell shrug 3x10-12 · Barbell curl 3x8-10 · Ab wheel 3x8-12',
  Tue: 'Push A — Overhead press 4x5-6 · Weighted dip 4x6-8 · Incline DB press 3x8-10 · Lateral raise 3x12-15 · Overhead tricep ext 3x10-12 · Cable external rotation 3x15',
  Thu: 'Legs + grip (25-30 min) — Bulgarian split squat 3x8 ea · Single-leg RDL 3x10 ea · Standing calf raise 4x12 · Tibialis raise 3x20 · Copenhagen plank 3x20s ea · Farmer’s carry 4x40m heavy · Dead hang open-hand 4x20-30s',
  Fri: 'Pull B — Wide-grip lat pulldown 4x10-12 · Seated cable row wide 3x10-12 · Straight-arm pulldown 3x12-15 · Chest-supported rear delt raise 3x15 · Face pull 3x15-20 · Incline DB curl 3x10-12 · Front lever progression 5x10-15s',
  Sat: 'Push B — Seated DB shoulder press 3x8-10 · Cable lateral raise 4x12-15 · Machine/cable chest press 3x10-12 · Overhead cable tricep ext 3x12-15 · Wrist curl + reverse wrist curl 3x15 ea · Hanging leg raise 3x max',
};

// Nutrition tables, verbatim from NEWPLAN.md. Phase 1 averages 2,450; Phase 2 3,150.
const FUEL = {
  1: { Mon: '2,300 kcal · 165g P · 240g C · 75g F', Tue: '2,450 kcal · 165g P · 290g C · 70g F', Wed: '2,550 kcal · 165g P · 325g C · 65g F', Thu: '2,400 kcal · 165g P · 280g C · 70g F', Fri: '2,300 kcal · 165g P · 240g C · 75g F', Sat: '2,450 kcal · 165g P · 290g C · 70g F', Sun: '2,700 kcal · 165g P · 365g C · 65g F' },
  2: { Mon: '3,000 kcal · 175g P · 355g C · 90g F', Tue: '3,150 kcal · 175g P · 395g C · 85g F', Wed: '3,250 kcal · 175g P · 425g C · 85g F', Thu: '3,100 kcal · 175g P · 385g C · 85g F', Fri: '3,000 kcal · 175g P · 355g C · 90g F', Sat: '3,150 kcal · 175g P · 395g C · 85g F', Sun: '3,400 kcal · 175g P · 470g C · 85g F' },
};

// Easy-run mileage by phase; cutback weeks (every 4th) drop to ~17 mi (P1) / ~19 mi (P2).
const MILES = {
  1: { normal: { Tue: 4, Wed: 4, Thu: 4, Sat: 3, Sun: 7 }, cutback: { Tue: 3, Wed: 3, Thu: 3, Sat: 3, Sun: 5 } },
  2: { normal: { Tue: 4, Wed: 5, Thu: 5, Sat: 4, Sun: 8 }, cutback: { Tue: 4, Wed: 3, Thu: 4, Sat: 3, Sun: 5 } },
};

// Wednesday quality rotation. Weeks 1-3 of each 4-week cycle; week 4 is the cutback.
// Progresses by volume, not intensity (NEWPLAN), then restarts at the harder end.
const QUALITY = [
  ['Cruise intervals — WU 10 min. 5 x 3 min @ threshold w/ 90s jog. CD 10 min.', 'Tempo — WU 10 min. 20 min continuous @ threshold. CD 10 min.', 'Hill sprints — WU. 8 x 15s steep hill near-max, walk fully down. + 4 strides. CD.'],
  ['Cruise intervals — WU 10 min. 6 x 3 min @ threshold w/ 90s jog. CD 10 min.', 'Tempo — WU 10 min. 22 min continuous @ threshold. CD 10 min.', 'Hill sprints — WU. 9 x 15s steep hill near-max, walk fully down. + 4 strides. CD.'],
  ['Cruise intervals — WU 10 min. 3 x 6 min @ threshold w/ 2 min jog. CD 10 min.', 'Tempo — WU 10 min. 25 min continuous @ threshold. CD 10 min.', 'Hill sprints — WU. 10 x 15s steep hill near-max, walk fully down. + 4 strides. CD.'],
  ['Cruise intervals — WU 10 min. 2 x 10 min @ threshold w/ 3 min jog. CD 10 min.', 'Tempo — WU 10 min. 25 min continuous @ threshold. CD 10 min.', 'Hill sprints — WU. 10 x 15s steep hill near-max, walk fully down. + 4 strides. CD.'],
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEIGH_DAYS = ['Mon', 'Wed', 'Fri']; // three mornings a week, same conditions
const WEIGH = 'Weigh in — after the bathroom, before food or water. Log it; track the weekly average.';

const tasks = [];
const start = new Date(`${START}T12:00:00`);

for (let week = 1; week <= P1_WEEKS + P2_WEEKS; week++) {
  const phase = week <= P1_WEEKS ? 1 : 2;
  const cutback = week % 4 === 0;
  const deload = week % 8 === 0; // every other cutback → the "every 6-8 weeks" deload
  const cycle = Math.floor((week - 1) / 4);
  // After cycle 4 the rotation restarts at the harder end rather than back at 5 x 3 min.
  const quality = QUALITY[cycle < QUALITY.length ? cycle : 2 + (cycle % 2)];
  const miles = MILES[phase][cutback ? 'cutback' : 'normal'];
  // Phase 2 long runs cycle 7 → 8 → 9 across non-cutback weeks (NEWPLAN says "7-9 mi").
  const longRun = phase === 2 && !cutback ? 7 + ((week - P1_WEEKS - 1) % 3) : miles.Sun;

  for (const [i, day] of DAYS.entries()) {
    const d = new Date(start);
    d.setDate(d.getDate() + (week - 1) * 7 + i);
    const date = d.toISOString().slice(0, 10);
    const add = (kind, text) => tasks.push({ id: `plan-${date}-${kind}`, text, done: false, date });

    // Running — Mon and Fri are run-free so they can hold the two heaviest lifts.
    if (day === 'Tue') add('run', `🏃 Easy — ${miles.Tue} mi · Conversational, nose-breathing + 6 x 20s strides`);
    if (day === 'Wed')
      add('run', cutback
        ? `🏃 Easy + strides — ${miles.Wed} mi · Cutback week: nothing hard. 6 x 20s strides.`
        : `🏃 QUALITY — ${miles.Wed} mi · ${quality[(week - 1) % 4]}`);
    if (day === 'Thu') add('run', `🏃 Easy — ${miles.Thu} mi · Conversational pace`);
    if (day === 'Sat') add('run', `🏃 Easy — ${miles.Sat} mi · Recovery disguised as training. Keep it conversational.`);
    if (day === 'Sun')
      add('run', `🏃 LONG RUN — ${longRun} mi · Easy effort. Never fasted; practice in-run fueling.`);

    // Lifting — one task per session.
    if (LIFTS[day]) add('lift', `💪 ${deload ? 'DELOAD — halve all sets, keep top weights · ' : ''}${LIFTS[day]}`);

    // Daily fuel target; week 6 of the cut is the maintenance diet break.
    const dietBreak = phase === 1 && week === DIET_BREAK_WEEK;
    add('fuel', dietBreak
      ? `🍽 ${MAINTENANCE} · Diet break — eat at maintenance all week`
      : `🍽 ${FUEL[phase][day]}`);

    if (WEIGH_DAYS.includes(day)) add('weigh', `⚖️ ${WEIGH}`);
  }
}

// Content version so App.jsx re-seeds a new/changed plan (a boolean flag never would).
const hash = tasks
  .reduce((h, t) => (h * 31 + t.id.length + t.text.length) >>> 0, 7)
  .toString(36); // ponytail: id+text-length hash; swap to a char-sum if collisions ever bite

const body =
  '// AUTO-GENERATED by scripts/gen-plan.mjs — do not edit by hand.\n' +
  '// Daily-task plan; re-seeds into the app when PLAN_VERSION changes (see App.jsx load()).\n' +
  `export const PLAN_VERSION = ${JSON.stringify(hash)};\n` +
  'export const PLAN = [\n' +
  tasks.map((t) => '  ' + JSON.stringify(t) + ',').join('\n') +
  '\n];\n';

writeFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/plan.js'), body);
console.log(`gen-plan: wrote ${tasks.length} tasks (v${hash}) to src/plan.js`);
