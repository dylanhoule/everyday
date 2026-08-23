// Generator: expands NEWPLAN.md's weekly template into dated tasks in src/plan.js.
// NEWPLAN.md is the human-readable source of truth; the tables below mirror it.
// Re-run with `npm run gen-plan` after editing either.
//
// PHASE 1 ONLY. Phase 2 gets seeded in November, off three weeks of real scale data —
// NEWPLAN calls every calorie number here "a starting hypothesis", so seeding a year of
// them now would just bake in guesses.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// COLLEGE REVISION (Aug 2026): running is now the commute. The gym is a mile away, so
// Mon/Tue/Thu/Fri/Sat are 1 mi there, lift, 1 mi back; Wednesday has no lift and is therefore
// a full rest day. 15 mi/wk instead of 22, and no quality session at all. Calories came down
// 100/day only because maintenance did (NEWPLAN: 2,470 + 14 × weekly miles).
const START = '2026-08-10'; // Monday
const WEEKS = 11; // Phase 1 cut: Aug 10 → Oct 25. Deficit ends Oct 26, or at 155 lb, whichever comes first.

// [session name, exercises]. One exercise per line in the app (see TodoItem: the first
// line is the title, the rest render as the detail block).
const LIFTS = {
  Mon: ['Pull A · heavy, thickness', ['Weighted pull-up — 5 × 4-6', 'Barbell row — 4 × 6-8', 'Chest-supported T-bar row — 3 × 10-12', 'Barbell shrug — 3 × 10-12', 'Barbell curl — 3 × 8-10', 'Ab wheel — 3 × 8-12']],
  Tue: ['Push A · heavy', ['Overhead press — 4 × 5-6', 'Weighted dip — 4 × 6-8', 'Incline DB press — 3 × 8-10', 'Lateral raise — 3 × 12-15', 'Overhead tricep extension — 3 × 10-12', 'Cable external rotation — 3 × 15']],
  Thu: ['Legs + grip · 25-30 min', ['Bulgarian split squat — 3 × 8 each', 'Single-leg Romanian deadlift — 3 × 10 each', 'Standing calf raise — 4 × 12', 'Tibialis raise — 3 × 20', 'Copenhagen plank — 3 × 20s each', 'Farmer’s carry — 4 × 40m heavy', 'Dead hang, open hand — 4 × 20-30s']],
  Fri: ['Pull B · width, volume', ['Wide-grip lat pulldown — 4 × 10-12', 'Seated cable row, wide grip — 3 × 10-12', 'Straight-arm pulldown — 3 × 12-15', 'Chest-supported rear delt raise — 3 × 15', 'Face pull — 3 × 15-20', 'Incline DB curl — 3 × 10-12', 'Front lever progression — 5 × 10-15s']],
  Sat: ['Push B · delts, arms, forearms', ['Seated DB shoulder press — 3 × 8-10', 'Cable lateral raise — 4 × 12-15', 'Machine or cable chest press — 3 × 10-12', 'Overhead cable tricep extension — 3 × 12-15', 'Wrist curl + reverse wrist curl — 3 × 15 each', 'Hanging leg raise — 3 × max']],
};

// Phase 1 nutrition table, verbatim from NEWPLAN.md. Weekly average 2,455.
// Wednesday is now the LOWEST day, not the highest — it used to hold the quality run and is
// now full rest. Sunday stays highest: it holds the only real run of the week.
const FUEL = { Mon: '2,510 kcal · 165g P · 305g C · 70g F', Tue: '2,470 kcal · 165g P · 295g C · 70g F', Wed: '2,325 kcal · 165g P · 270g C · 65g F', Thu: '2,450 kcal · 165g P · 290g C · 70g F', Fri: '2,435 kcal · 165g P · 275g C · 75g F', Sat: '2,390 kcal · 165g P · 275g C · 70g F', Sun: '2,605 kcal · 165g P · 340g C · 65g F' };

// Meal timing, from NEWPLAN.md's three templates. Written out per day rather than scaled by
// code: the only thing that varies between days on the same template is four carb numbers,
// and the arithmetic is already done in NEWPLAN. Each day's macros must sum to its FUEL
// target; asserted below, so a bad edit fails `npm run gen-plan` instead of shipping.
// A = gym morning (Mon/Tue/Thu/Fri/Sat) · B = rest (Wed) · C = long run (Sun)
const MEALS = {
  Mon: ['6:45 Pre-run · 0-15C', '8:45 Breakfast, post-lift, biggest meal · 50P 100C 20F', '12:30 Lunch · 40P 75C 20F', '3:30 Snack · 20P 60C 10F', '7:00 Dinner · 40P 70C 18F', '10:00 Pre-bed · 15P 2F'],
  Tue: ['6:45 Pre-run · 0-15C', '8:45 Breakfast, post-lift, biggest meal · 50P 95C 20F', '12:30 Lunch · 40P 75C 20F', '3:30 Snack · 20P 55C 10F', '7:00 Dinner · 40P 70C 18F', '10:00 Pre-bed · 15P 2F'],
  Thu: ['6:45 Pre-run · 0-15C', '8:45 Breakfast, post-lift, biggest meal · 50P 95C 20F', '12:30 Lunch · 40P 70C 20F', '3:30 Snack · 20P 55C 10F', '7:00 Dinner · 40P 70C 18F', '10:00 Pre-bed · 15P 2F'],
  Fri: ['6:45 Pre-run · 0-15C', '8:45 Breakfast, post-lift, biggest meal · 50P 90C 25F', '12:30 Lunch · 40P 70C 20F', '3:30 Snack · 20P 50C 10F', '7:00 Dinner · 40P 65C 18F', '10:00 Pre-bed · 15P 2F'],
  Sat: ['6:45 Pre-run · 0-15C', '8:45 Breakfast, post-lift, biggest meal · 50P 90C 20F', '12:30 Lunch · 40P 70C 20F', '3:30 Snack · 20P 50C 10F', '7:00 Dinner · 40P 65C 18F', '10:00 Pre-bed · 15P 2F'],
  Wed: ['Rest day. No morning session, so sleep in and eat breakfast late.', '8:00 Breakfast · 40P 60C 18F', '12:30 Lunch · 40P 70C 20F', '3:30 Snack · 20P 50C 10F', '7:00 Dinner, biggest meal · 45P 85C 15F', '10:00 Pre-bed · 20P 5C 2F'],
  Sun: ['Wake ~6:50. The only run you go out for.', '7:00 Pre-run · 40C', '7:30-8:15 During run · 20C (gut training, not need)', '8:30 Breakfast, biggest meal · 45P 95C 15F', '12:30 Lunch · 40P 70C 20F', '3:30 Snack · 20P 50C 10F', '7:00 Dinner · 40P 60C 18F', '10:00 Pre-bed · 20P 5C 2F'],
};

// Meal macros must add up to the day's target. "0-15C" on the optional pre-run counts as 0.
for (const [day, meals] of Object.entries(MEALS)) {
  for (const macro of ['P', 'C', 'F']) {
    const got = meals.reduce((n, m) => n + Number(m.match(new RegExp(`(?<![-\\d])(\\d+)${macro}\\b`))?.[1] ?? 0), 0);
    const want = Number(FUEL[day].match(new RegExp(`(\\d+)g ${macro}`))[1]);
    if (got !== want) throw new Error(`${day}: meals total ${got}g ${macro}, FUEL says ${want}g`);
  }
}

// Phase 1 mileage: 15 mi/week FLAT (NEWPLAN rule 3 — "Do not creep"). Mon/Tue/Thu/Fri/Sat
// are the gym commute — 1 mi there, 1 mi back — so they're pinned at 2 by the distance to the
// gym. That makes the long run the only cutback lever; you still have to get to the gym.
const MILES = {
  normal: { Mon: 2, Tue: 2, Thu: 2, Fri: 2, Sat: 2, Sun: 5 }, //  = 15
  cutback: { Mon: 2, Tue: 2, Thu: 2, Fri: 2, Sat: 2, Sun: 3 }, // = 13
};

// No quality rotation in Phase 1: Wednesday is the only day without a lift, so it's a full
// rest day. The rotation is parked in NEWPLAN.md under "Quality session rotation, PARKED"
// for whoever rebuilds the running block in November.

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEIGH_DAYS = ['Mon', 'Wed', 'Fri']; // three mornings a week, same conditions
const WEIGH = '📊 Weigh in\nAfter the bathroom, before food or water.\nLog it — track the weekly average, never a single day.';

// Task text is `title\ndetail…`: the app renders line 1 as the title and the rest as a
// smaller detail block, so every task reads as a heading plus its prescription.
const split1 = (s, sep) => s.replace(sep, '\n'); // first separator only → title / detail

const tasks = [];
const start = new Date(`${START}T12:00:00`);

for (let week = 1; week <= WEEKS; week++) {
  const cutback = week % 4 === 0;
  const deload = week % 8 === 0; // every other cutback → the "every 6-8 weeks" deload
  const miles = MILES[cutback ? 'cutback' : 'normal'];

  for (const [i, day] of DAYS.entries()) {
    const d = new Date(start);
    d.setDate(d.getDate() + (week - 1) * 7 + i);
    const date = d.toISOString().slice(0, 10);
    const add = (kind, text) => tasks.push({ id: `plan-${date}-${kind}`, text, done: false, date });

    // Running — the gym is a mile away, so every lift day is a 2 mi round trip around the
    // session. Wednesday has no lift, so no run: MILES has no Wed key and this falls through.
    if (day !== 'Sun' && miles[day])
      add('run', `🏃 Gym commute · ${miles[day]} mi\n1 mi there, 1 mi back. Transport, not training — conversational both ways.\nThe run out is your warm-up, the run back is the cooldown.`);
    if (day === 'Sun')
      add('run', `🏃 LONG RUN · ${miles.Sun} mi\n${cutback ? 'Cutback week: short and easy, nothing to prove.' : 'Easy effort, conversational the whole way.'}\nNever fasted. Practice in-run fueling — 20g carbs, gut training for the 50K.`);

    // Lifting — one task per session, one exercise per line.
    if (LIFTS[day]) {
      const [name, exercises] = LIFTS[day];
      const head = deload ? `${name}\nDELOAD — halve all sets, keep top weights` : name;
      add('lift', `💪 ${head}\n${exercises.join('\n')}`);
    }

    // Daily fuel target.
    add('fuel', `🥗 ${split1(FUEL[day], ' · ')}\n${MEALS[day].join('\n')}`);

    if (WEIGH_DAYS.includes(day)) add('weigh', WEIGH);

    // The plan runs out at the end of week 11, so put the reseed reminder at the start of
    // it — a week of runway rather than a nasty surprise on the last day.
    if (week === WEEKS && day === 'Mon')
      add('task', '📌 Seed Phase 2 — last week of the cut\nThe cut ends Mon Oct 26, or the day you hit 155 lb, whichever comes first.\nEdit the tables in scripts/gen-plan.mjs, then: npm run gen-plan && npm test.\nSet the new calories off your last 3 weeks of scale data, not the table — NEWPLAN calls every number in it a starting hypothesis.\nRunning: rebuild off what the commute structure actually sustained, NOT the old 25 mi/wk number — that assumed a plan you no longer run.\nIf you want speed back, the cheapest fix is 6 × 20s strides on a run home. Two minutes.');
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
