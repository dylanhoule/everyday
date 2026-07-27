// One-off generator: parses myplan.md's daily tables into src/plan.js.
// Re-run with `node scripts/gen-plan.mjs` if myplan.md changes.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));
const src = process.argv[2] || join(dir, '../myplan.md'); // optional path arg; defaults to myplan.md
const md = readFileSync(src, 'utf8');

const DAY = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/;
const strip = (s) => s.replace(/\*\*/g, '').trim();

// Year comes from the doc's "Plan start: … YYYY" (or "Plan runs … YYYY") line, then rolls
// forward whenever the month wraps (daily rows are chronological), so any date range works.
const startYear = Number((md.match(/Plan (?:start|runs)[^\n]*?(\d{4})/) || [])[1]);
if (!startYear) throw new Error(`gen-plan: no "Plan start: … YYYY" line found in ${src}`);
let year = startYear, prevMonth = 0;

// Heading-format plans: `### <Weekday> <Mon> <DD>` days, each with `- [ ] **Main:** …` and
// `- [ ] **20-min:** …` items. One 📌 task per day = Main text + "⤵ Floor: <20-min>".
const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
const HEAD = /^#{2,4}\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Z][a-z]{2})\s+(\d{1,2})\b/;
const isHeadingPlan = md.split('\n').some((l) => HEAD.test(l));

if (isHeadingPlan) {
  const tasks = [];
  let date = null, main = null, floor = null;
  const flush = () => {
    if (date && (main || floor)) {
      const text = main ? `📌 ${main}${floor ? ` ⤵ Floor: ${floor}` : ''}` : `📌 ${floor}`;
      tasks.push({ id: `plan-${date}-task`, text, done: false, date });
    }
    main = floor = null;
  };
  for (const line of md.split('\n')) {
    const h = line.match(HEAD);
    if (h) {
      flush();
      const m = MONTHS[h[1]];
      if (!m) { date = null; continue; }
      if (prevMonth && m < prevMonth) year++; // month wrapped (Dec→Jan) → next year
      prevMonth = m;
      date = `${year}-${String(m).padStart(2, '0')}-${h[2].padStart(2, '0')}`;
      continue;
    }
    const mm = line.match(/^\s*-\s*\[[ xX]?\]\s*\*\*Main:\*\*\s*(.*)$/);
    if (mm) { main = strip(mm[1]); continue; }
    const fm = line.match(/^\s*-\s*\[[ xX]?\]\s*\*\*20-min:\*\*\s*(.*)$/);
    if (fm) { floor = strip(fm[1]); continue; }
  }
  flush();
  writePlan(tasks);
  process.exit(0);
}

const tasks = [];
for (const line of md.split('\n')) {
  if (!line.startsWith('|')) continue;
  const cells = line.split('|').map((c) => c.trim());
  const dayCell = strip(cells[1] || ''); // "Mon 07/20" (bold on Sundays)
  if (!DAY.test(dayCell)) continue; // skips summary/progression/header/separator rows

  const session = strip(cells[2] || '').replace(/\s*\(quality\)$/, ''); // drop the editorial "(quality)" tag; keep "(intro)"/"(sharpen)"
  const miles = strip(cells[3] || ''); // number, or "–" on rest days
  const detail = (cells[4] || '').trim(); // run note, or "**Strength ...**" block

  const [, mm, dd] = dayCell.match(/(\d{2})\/(\d{2})/);
  const m = Number(mm);
  if (prevMonth && m < prevMonth) year++; // month wrapped (e.g. Dec→Jan) → next year
  prevMonth = m;
  const date = `${year}-${mm}-${dd}`;

  const isStrength = /^\*\*Strength/.test(detail);

  if (/^\d+$/.test(miles)) {
    const emoji = /RACE:/.test(session) ? '🏁' : '🏃'; // only the 50K ("RACE: 50K"), not "Race openers"
    const note = isStrength ? '' : strip(detail); // Wed's detail is strength → no run note
    const text = `${emoji} ${session} — ${miles} mi${note ? ` · ${note}` : ''}`;
    tasks.push({ id: `plan-${date}-run`, text, done: false, date });
  }

  if (isStrength) {
    detail
      .replace(/\*\*/g, '')
      .replace(/\s*\[Blk \d+\]/, '') // drop internal block tag
      .replace(/^[^:]*:\s*/, '') // drop the "Strength X – Focus:" label
      .replace(/\.\s*Core:\s*/, '; ') // fold the core block into the exercise list
      .split(';') // one todo per exercise
      .map((e) => e.trim())
      .filter(Boolean)
      .forEach((ex, i) => {
        tasks.push({ id: `plan-${date}-strength-${i}`, text: `💪 ${ex}`, done: false, date });
      });
  }

  // Generic daily-task plans — table `| Day | Session | What to do |`. Any weekday row that
  // is neither a run (integer miles) nor a strength block → one todo per day: the session
  // label + the instruction. Running rows always match run/strength, so this never fires
  // for them and their output stays identical.
  if (!/^\d+$/.test(miles) && !isStrength) {
    const what = strip(cells[3] || '');
    if (what && what !== '–' && what !== '-') {
      tasks.push({ id: `plan-${date}-task`, text: `📌 ${session ? `${session} — ` : ''}${what}`, done: false, date });
    }
  }
}

writePlan(tasks);

function writePlan(tasks) {
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

  writeFileSync(join(dir, '../src/plan.js'), body);
  console.log(`gen-plan: wrote ${tasks.length} tasks (v${hash}) to src/plan.js`);
}
