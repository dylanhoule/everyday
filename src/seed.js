// Seed batches: goals, habits, and tasks written by Claude from a plan (/seed-goals skill).
//
// Each batch applies once, right after a device's first successful sync pull, and leaves a
// synced `seedmark:<batch id>` record so no other device applies it again (records.js
// applySeeds). Ids are stable: goal `seed:<goal>`, habit `seed:<goal>:<habit>`, task
// `seed:<goal>:t:<task>`. Re-seeding a goal = a NEW batch that reuses its slug; never edit an
// applied batch in place. Applied batches can be deleted from this file at any time.
// `npm test` (seed.test.js) rejects malformed batches.

// From fitnessplan.md: half marathon rebuild, Nov 9, 2026 to Jan 1, 2027. Seeded from Sat Nov 21.
const halfMarathonBlock = (() => {
  const HM = 'seed:half-marathon';
  const LS = 'seed:lean-and-strong';
  const TODAY = '2026-11-21';

  const PAIN = 'After: rate forefoot pain 0 to 5. Hit 3 during the run: stop and walk home.';
  const EASY = `Conversational. Grass, track, or trail if you can. ${PAIN}`;
  const EARLY = `${EASY} A 1-minute walk every 10 minutes is fine this week.`;
  const LONG = `Easy and conversational the whole way. Never make up a missed long run. ${PAIN}`;
  const RIDE = 'Gym bike, conversational. Stiff-soled shoes or flat pedals. Same pain rule as runs; it never replaces a run.';
  const OPTIONAL = 'Optional: only if the foot has been quiet. Skip it any week a run hit 3 or more.';
  const SETS = 'Stop each set one rep short of failure. Week 7 (Dec 21 to 27): one set fewer per exercise, minimum 2.';

  const task = (slug, date, title, note, extra = {}) => ({
    id: `${HM}:t:${slug}`, type: 'task', goalId: HM, title, note, date, done: false, ...extra,
  });
  const run = (date, kind, mi, note) => task(`run-${date}`, date, `${kind} · ${mi} mi`, note, { amount: mi, unit: 'mi' });
  const ride = (date, min, optional) =>
    task(`ride-${date}`, date, `${optional ? 'Optional easy ride' : 'Easy ride'} · ${min} min`, optional ? `${OPTIONAL} ${RIDE}` : RIDE, { amount: min, unit: 'min' });
  // One plan week from Tuesday on: [tue run, wed ride, thu run, fri ride, sat run, sun long].
  const week = ([tue, wed, thu, fri, sat, sun], [tueMi, rideMin, thuMi, satMi, longMi], longNote = LONG) => [
    run(tue, 'Easy run', tueMi, EASY),
    ride(wed, rideMin, false),
    run(thu, 'Easy run', thuMi, EASY),
    ride(fri, rideMin, true),
    run(sat, 'Short easy run', satMi, EASY),
    run(sun, 'Long run', longMi, longNote),
  ];

  const lift = (slug, title, day, note) => ({
    id: `${LS}:${slug}`, type: 'habit', goalId: LS, title, note, days: [day], unit: 'lifts', startDate: TODAY, endDate: '2026-12-27',
  });

  return {
    id: '2026-11-21-half-marathon-block',
    records: [
      {
        id: HM, type: 'goal', name: 'Half marathon', title: 'Finish the Jan 1 half marathon healthy', color: 'orange',
        date: '2027-01-01', createdAt: TODAY,
        measure: { unit: 'mi', target: 13, per: 'week' },
        stat: { value: '9:09', label: 'stretch pace / mi (sub-2:00)' },
        note: 'Finish healthy first. Sub-2:00 stays on only if weeks 4 to 6 go clean. Step up a week only if every run stayed at 0 to 2 forefoot pain and the mornings after were quiet; otherwise repeat the week. Missed run: skip it, never double up.',
        path: [
          { name: 'Week 1: Rebuild', start: '2026-11-09', end: '2026-11-15', note: '10 mi, long run 3.5 mi.', target: 10 },
          { name: 'Week 2: Rebuild', start: '2026-11-16', end: '2026-11-22', note: '13 mi, long run 4.5 mi.', target: 13 },
          { name: 'Week 3: Build', start: '2026-11-23', end: '2026-11-29', note: '16 mi, long run 6 mi.', target: 16 },
          { name: 'Week 4: Hold', start: '2026-11-30', end: '2026-12-06', note: '20 mi, long run 7.5 mi.', target: 20 },
          { name: 'Week 5: Hold', start: '2026-12-07', end: '2026-12-13', note: '20 mi, long run 8 mi.', target: 20 },
          { name: 'Week 6: Peak', start: '2026-12-14', end: '2026-12-20', note: '24 mi, long run 10 mi. Last 2 mi at goal effort only if weeks 4 and 5 were pain-free.', target: 24 },
          { name: 'Week 7: Taper', start: '2026-12-21', end: '2026-12-27', note: '16 mi, long run 6 mi. Lifts drop one set.', target: 16 },
          { name: 'Race week', start: '2026-12-28', end: '2027-01-01', note: '5.5 mi, then the race on Friday.', target: 18.6 },
        ],
      },
      // Week 2, from today
      run('2026-11-21', 'Short easy run', 2.5, EARLY),
      run('2026-11-22', 'Long run', 4.5, `${LONG} A 1-minute walk every 10 minutes is fine this week.`),
      // Weeks 3 to 7
      ...week(['2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29'], [3.5, 45, 4, 2.5, 6]),
      ...week(['2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05', '2026-12-06'], [4.5, 45, 5, 3, 7.5]),
      ...week(['2026-12-08', '2026-12-09', '2026-12-10', '2026-12-11', '2026-12-12', '2026-12-13'], [4.5, 60, 5, 2.5, 8]),
      ...week(['2026-12-15', '2026-12-16', '2026-12-17', '2026-12-18', '2026-12-19', '2026-12-20'], [5, 60, 5.5, 3.5, 10],
        `Easy and conversational. The last 2 mi may go to goal effort (about 9:09/mi) only if weeks 4 and 5 were pain-free. ${PAIN}`),
      ...week(['2026-12-22', '2026-12-23', '2026-12-24', '2026-12-25', '2026-12-26', '2026-12-27'], [4, 30, 4, 2, 6]),
      // Race week
      run('2026-12-29', 'Easy run', 3.5, EASY),
      run('2026-12-31', 'Shakeout', 2, 'Very easy. Lay out gear and bib, early night.'),
      task('race', '2027-01-01', 'Race: half marathon · 13.1 mi',
        'Soft shoes you trust, nothing new. Warm up 10 min easy with 3 strides. Miles 1 to 3 at 9:10, 4 to 10 at 9:00, then hold on (sub-2:00 is a 9:09 average). Gels at miles 4, 8, and 11 with water. Finishing healthy comes first. After: walk only for three days, then easy 20 to 30 minute runs.',
        { amount: 13.1, unit: 'mi' }),

      {
        id: LS, type: 'goal', name: 'Lean and strong', title: 'Lean and strong: 10 to 12% body fat', color: 'blue', createdAt: TODAY,
        measure: { unit: 'lifts', target: 4, per: 'week' },
        note: 'About 10 to 12% body fat at 5\'8" and 160 lb. Legs stay light while mileage builds: no calf raises, no kneeling, push-ups with hands elevated. Finals week: lifts can shrink to 2 sets each, and sleep wins over a lift.',
        path: [
          { name: 'Lifting block', start: TODAY, end: '2026-12-27', note: 'Four lifts a week, mornings. Week 7 drops one set per exercise.', target: 4 },
          { name: 'Race week', start: '2026-12-28', end: '2027-01-01', note: 'Lift 1 only, 2 sets each, easy.', target: 1 },
        ],
      },
      lift('lift-1', 'Lift 1: upper push + core', 2, [
        `Push, chin-ups, cable press and pulls, core. ${SETS}`,
        'A1 Push-up, hands elevated: 4 × 8-15 (past 15 on every set: lower the hands a step)',
        'A2 Chin-up: 4 × max - 1',
        'B1 Split-stance 1-arm cable press: 3 × 10-12 / side (front foot flat, no kneeling)',
        'B2 Cable face pull: 3 × 12-15 (rope to forehead, elbows high)',
        'C1 Cable lateral raise: 3 × 12-20 / side',
        'C2 Pallof press: 3 × 10 / side (hold 3 s at full reach)',
        'D1 Cable curl: 2 × 12-15',
        'D2 Cable rope pushdown: 2 × 12-15',
        'E Dead bug: 3 × 8 / side (low back flat on the floor)',
      ].join('\n')),
      lift('lift-2', 'Lift 2: light legs + pull', 3, [
        `Light legs, flat feet, no calf raises. ${SETS}`,
        'A1 Goblet squat to a bench (45 lb KB): 2 × 10-12 (weight in heel and mid-foot, 3 s down)',
        'A2 Pull-up: 3 × max - 1',
        'B1 Single-leg RDL (45 lb KB): 2 × 8-10 / leg (press the whole foot, not the ball)',
        'B2 Standing 1-arm cable row: 3 × 10-12 / side (pause 1 s at the ribs)',
        'C1 Tibialis raise, back to a wall: 3 × 15-20',
        'C2 Copenhagen side plank: 2 × 20-30 s / side (start with the knee on the bench)',
        'D Suitcase carry (45 lb KB): 3 × 40 m / side (stay tall, short flat-footed steps)',
      ].join('\n')),
      lift('lift-3', 'Lift 3: upper pull + core', 4, [
        `Pull-ups, press, rows, core. ${SETS}`,
        'A1 Pull-up (neutral or wide grip): 4 × max - 1',
        'A2 Standing KB press (45 lb): 3 × 4-8 / side (under 4 strict reps: small leg drive)',
        'B1 Split-stance 1-arm cable row: 3 × 10-12 / side',
        'B2 Push-up, hands elevated: 3 × max - 2 (3 s down)',
        'C1 Cable woodchop, high to low: 3 × 10 / side',
        'C2 Side plank: 3 × 30-45 s / side',
        'D Hanging knee raise: 3 × 10-12 (no swinging)',
      ].join('\n')),
      lift('lift-4', 'Lift 4: short upper + carries', 6, [
        `Short upper and carries. No legs: long run tomorrow. ${SETS}`,
        'A1 Push-up, hands elevated: 3 × max - 2',
        'A2 1-arm cable row: 3 × 10-12 / side',
        'B1 Cable lateral raise: 2 × 12-20 / side',
        'B2 Cable curl: 2 × 12-15',
        'C Farmer carry (two 45 lb KBs): 3 × 40 m (keep it crisp)',
      ].join('\n')),
      {
        id: `${LS}:t:lift-1-race-week`, type: 'task', goalId: LS, title: 'Lift 1: upper push + core (easy)',
        note: '2 sets each, easy. Race on Friday.', date: '2026-12-29', unit: 'lifts', done: false,
      },
    ],
  };
})();

export const SEEDS = [halfMarathonBlock];
