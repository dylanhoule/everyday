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

const START = '2026-08-10'; // Monday
const WEEKS = 12; // Phase 1 cut: Aug 10 → Nov 1 ("Now → ~Nov 1 (12 wks)")
const DIET_BREAK_WEEK = 6; // NEWPLAN: "at week 6, eat at maintenance for one full week"
const MAINTENANCE = '2,780 kcal · 165g P';

// [session name, exercises]. One exercise per line in the app (see TodoItem: the first
// line is the title, the rest render as the detail block).
const LIFTS = {
  Mon: ['Pull A · heavy, thickness', ['Weighted pull-up — 5 × 4-6', 'Barbell row — 4 × 6-8', 'Chest-supported T-bar row — 3 × 10-12', 'Barbell shrug — 3 × 10-12', 'Barbell curl — 3 × 8-10', 'Ab wheel — 3 × 8-12']],
  Tue: ['Push A · heavy', ['Overhead press — 4 × 5-6', 'Weighted dip — 4 × 6-8', 'Incline DB press — 3 × 8-10', 'Lateral raise — 3 × 12-15', 'Overhead tricep extension — 3 × 10-12', 'Cable external rotation — 3 × 15']],
  Thu: ['Legs + grip · 25-30 min', ['Bulgarian split squat — 3 × 8 each', 'Single-leg Romanian deadlift — 3 × 10 each', 'Standing calf raise — 4 × 12', 'Tibialis raise — 3 × 20', 'Copenhagen plank — 3 × 20s each', 'Farmer’s carry — 4 × 40m heavy', 'Dead hang, open hand — 4 × 20-30s']],
  Fri: ['Pull B · width, volume', ['Wide-grip lat pulldown — 4 × 10-12', 'Seated cable row, wide grip — 3 × 10-12', 'Straight-arm pulldown — 3 × 12-15', 'Chest-supported rear delt raise — 3 × 15', 'Face pull — 3 × 15-20', 'Incline DB curl — 3 × 10-12', 'Front lever progression — 5 × 10-15s']],
  Sat: ['Push B · delts, arms, forearms', ['Seated DB shoulder press — 3 × 8-10', 'Cable lateral raise — 4 × 12-15', 'Machine or cable chest press — 3 × 10-12', 'Overhead cable tricep extension — 3 × 12-15', 'Wrist curl + reverse wrist curl — 3 × 15 each', 'Hanging leg raise — 3 × max']],
};

// Phase 1 nutrition table, verbatim from NEWPLAN.md. Weekly average 2,450.
const FUEL = { Mon: '2,300 kcal · 165g P · 240g C · 75g F', Tue: '2,450 kcal · 165g P · 290g C · 70g F', Wed: '2,550 kcal · 165g P · 325g C · 65g F', Thu: '2,400 kcal · 165g P · 280g C · 70g F', Fri: '2,300 kcal · 165g P · 240g C · 75g F', Sat: '2,450 kcal · 165g P · 290g C · 70g F', Sun: '2,700 kcal · 165g P · 365g C · 65g F' };

// Phase 1 mileage: 22 mi/week FLAT (NEWPLAN rule 3 — "Do not creep"). Every 4th week
// cuts back to ~17. The cutback day-by-day split is ours; NEWPLAN gives only the total.
const MILES = {
  normal: { Tue: 4, Wed: 4, Thu: 4, Sat: 3, Sun: 7 }, //  = 22
  cutback: { Tue: 3, Wed: 3, Thu: 3, Sat: 3, Sun: 5 }, // = 17
};

// Wednesday quality rotation: weeks 1-3 of each 4-week cycle, week 4 is the cutback.
// Only the interval session progresses ("add volume to the interval, not intensity:
// 5 x 3 min → 6 x 3 min → 3 x 6 min"); tempo and hills are prescribed once in NEWPLAN
// and stay put. Three cycles covers all 12 weeks.
const TEMPO = 'Tempo — WU 10 min. 20 min continuous @ threshold. CD 10 min.';
const HILLS = 'Hill sprints — WU. 8 x 15s steep hill near-max, walk fully down. + 4 strides. CD.';
const QUALITY = [
  ['Cruise intervals — WU 10 min. 5 x 3 min @ threshold w/ 90s jog. CD 10 min.', TEMPO, HILLS],
  ['Cruise intervals — WU 10 min. 6 x 3 min @ threshold w/ 90s jog. CD 10 min.', TEMPO, HILLS],
  ['Cruise intervals — WU 10 min. 3 x 6 min @ threshold w/ 2 min jog. CD 10 min.', TEMPO, HILLS],
];

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
  const quality = QUALITY[Math.floor((week - 1) / 4)];
  const miles = MILES[cutback ? 'cutback' : 'normal'];

  for (const [i, day] of DAYS.entries()) {
    const d = new Date(start);
    d.setDate(d.getDate() + (week - 1) * 7 + i);
    const date = d.toISOString().slice(0, 10);
    const add = (kind, text) => tasks.push({ id: `plan-${date}-${kind}`, text, done: false, date });

    // Running — Mon and Fri are run-free so they can hold the two heaviest lifts.
    if (day === 'Tue') add('run', `🏃 Easy run — ${miles.Tue} mi\nConversational, nose-breathing.\n+ 6 × 20s strides`);
    if (day === 'Wed')
      add('run', cutback
        ? `🏃 Easy run — ${miles.Wed} mi\nCutback week: nothing hard.\n+ 6 × 20s strides`
        : `🏃 QUALITY — ${miles.Wed} mi\n${split1(quality[(week - 1) % 4], ' — ')}`);
    if (day === 'Thu') add('run', `🏃 Easy run — ${miles.Thu} mi\nConversational pace.`);
    if (day === 'Sat') add('run', `🏃 Easy run — ${miles.Sat} mi\nRecovery disguised as training.\nKeep it conversational.`);
    if (day === 'Sun')
      add('run', `🏃 LONG RUN — ${miles.Sun} mi\nEasy effort, time on feet.\nNever fasted; practice in-run fueling.`);

    // Lifting — one task per session, one exercise per line.
    if (LIFTS[day]) {
      const [name, exercises] = LIFTS[day];
      const head = deload ? `${name}\nDELOAD — halve all sets, keep top weights` : name;
      add('lift', `💪 ${head}\n${exercises.join('\n')}`);
    }

    // Daily fuel target; week 6 of the cut is the maintenance diet break.
    add('fuel', week === DIET_BREAK_WEEK
      ? `🥗 ${split1(MAINTENANCE, ' · ')}\nDiet break — eat at maintenance all week.`
      : `🥗 ${split1(FUEL[day], ' · ')}`);

    if (WEIGH_DAYS.includes(day)) add('weigh', WEIGH);

    // The plan runs out at the end of week 12, so put the reseed reminder at the start of
    // it — a week of runway rather than a nasty surprise on the last day.
    if (week === WEEKS && day === 'Mon')
      add('task', '📌 Seed Phase 2 — last week of the cut\nEdit the tables in scripts/gen-plan.mjs, then: npm run gen-plan && npm test.\nSet the new calories off your last 3 weeks of scale data, not the table — NEWPLAN calls every number in it a starting hypothesis.\nRunning goes to 25 mi/wk FLAT. Do not let the long run creep past 7.');
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
