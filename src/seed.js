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

// From plans/appearanceplan: skin, hair, posture, smile, wardrobe, and sleep as ONE goal.
// Nov 21, 2026 to May 9, 2027. The body-fat goal already exists (seed:lean-and-strong, batch
// above); this batch only adds its Monday check-in habits, without re-seeding the goal or its lifts.
const appearanceBlock = (() => {
  const T = '2026-11-21';
  const END = '2027-05-09';
  const ALL = [0, 1, 2, 3, 4, 5, 6];
  const A = 'seed:appearance';
  const LEAN = 'seed:lean-and-strong';

  const habit = (slug, title, days, extra = {}) => ({
    id: `${A}:${slug}`, type: 'habit', goalId: A, title, days, startDate: T, ...extra,
  });
  const task = (slug, date, title, note, extra = {}) => ({
    id: `${A}:t:${slug}`, type: 'task', goalId: A, title, ...(note && { note }), date, done: false, ...extra,
  });
  const lines = (...l) => l.join('\n');

  const BARBER = 'Script: "I\'m growing the top out. Just shape it and texturize so the waves separate. Low taper on the sides, scissor over comb, nothing high or skin-tight. Clean up ears and neckline."';
  const DIFFERIN_SKIP = 'Irritated? Skip one night and check this off anyway: that\'s the rule, not a miss. Don\'t advance a step until the skin settles.';
  const PHOTOS = 'Front, side, and a close-up of the face. Same spot and light, plain fitted tee, no filter.';
  const FIT = 'Fit: shoulder seam at the shoulder edge, sleeves hug without squeezing, tee hem at mid-zipper, no large logos, pants slim without bunching at the ankle. Between sizes, size down.';

  return {
    id: '2026-11-21-appearance',
    records: [
      {
        id: A, type: 'goal', name: 'Appearance', title: 'Clear skin, wavy hair, upright posture, a whiter smile, fitted clothes', color: 'cyan',
        date: END, createdAt: T,
        note: 'Clear, even skin; medium-length wavy hair (longer on top, short tapered sides); shoulders back, neck stacked; a clean, whiter smile; a fitted core wardrobe instead of oversized hoodies; 7.5+ hours of sleep. Review May 9 against photos and logs.',
        path: [
          { name: 'Set up', start: T, end: '2026-12-20', note: 'Products today, Differin from Nov 30, first cut by Dec 5, closet audit Dec 6, wardrobe phase 1 by Dec 20.' },
          { name: 'Winter break', start: '2026-12-21', end: '2027-01-31', note: 'Differin nightly from Dec 28, cheek bumps fewer by Jan 2, dentist by Jan 9, whitening Jan 10 to 31, skin check Jan 16, second cut, wardrobe phase 2 by Jan 31.' },
          { name: 'Check-in', start: '2027-02-01', end: '2027-02-21', note: 'Posture visibly better in side photos by Feb 14, red marks faded by Feb 21.' },
          { name: 'Finish', start: '2027-02-22', end: END, note: 'Third cut Mar 13 to 27. Clear, even skin and medium wavy hair by May 9.' },
        ],
      },

      // Skin
      habit('am-routine', 'AM skin routine', ALL, {
        note: lines('After the morning shower, before leaving.', 'Cleanse (lukewarm water, pat dry)', 'Azelaic acid on the cheeks', 'SPF 30 moisturizer', 'Lip balm', 'No picking; hands and phone off the cheeks.'),
      }),
      habit('pm-routine', 'PM skin routine', ALL, {
        time: '21:30',
        note: lines('Cleanse, Differin on scheduled nights, moisturize.', 'Cleanse (lukewarm water, pat dry)', 'Differin, only when it\'s on today\'s list', 'PM moisturizer', 'Lip balm', 'Mild stinging or flaking in the first 2 weeks is normal.'),
      }),
      habit('post-run-rinse', 'Rinse face after the run', [0, 2, 4, 6], {
        endDate: '2027-01-01',
        note: 'Rinse and moisturize within 30 min of finishing. Cold or windy: moisturize and lip balm before heading out.',
      }),
      habit('differin-step-1', 'Differin', [1, 3, 5], {
        time: '21:30', startDate: '2026-11-30', endDate: '2026-12-13', note: `Ramp step 1: Mon, Wed, Fri nights. ${DIFFERIN_SKIP}`,
      }),
      ...['2026-12-14', '2026-12-16', '2026-12-18', '2026-12-20', '2026-12-22', '2026-12-24', '2026-12-26'].map((d) =>
        task(`differin-${d}`, d, 'Differin', `Ramp step 2: every other night through Dec 27. ${DIFFERIN_SKIP}`, { time: '21:30' })),
      habit('differin-step-3', 'Differin', ALL, {
        time: '21:30', startDate: '2026-12-28',
        note: `Ramp step 3: nightly, if there's no more than mild flaking. If not, stay every other night and ask Claude to adjust. ${DIFFERIN_SKIP}`,
      }),
      task('buy-products', T, 'Buy missing skin and hair products', lines(
        'Skip what you already own. If something arrives late, azelaic starts that day and Differin 7+ days after.',
        'CeraVe Foaming Facial Cleanser (or Vanicream Gentle if skin is dry)',
        'CeraVe AM Facial Moisturizing Lotion SPF 30',
        'CeraVe PM Facial Moisturizing Lotion',
        'Differin (adapalene 0.1%) gel',
        'Azelaic acid 10% (The Ordinary Suspension or Paula\'s Choice Booster)',
        'Lip balm',
        'Gentle shampoo and conditioner',
        'Light leave-in spray (It\'s a 10 Miracle Leave-In or Not Your Mother\'s Curl Talk Leave-In)',
        'Sea salt spray or light mousse (Not Your Mother\'s Beach Babe or Curl Talk Mousse)',
        'Microfiber towel or an old cotton tee for drying hair',
        'Blotting papers',
        'Brow scissors, slant tweezers, nose/ear trimmer, nail clippers',
        'Floss',
        '2 extra pillowcases',
        'Optional: diffuser for the blow dryer',
      )),
      task('skin-check', '2027-01-16', 'Skin check', 'If it hasn\'t improved, or the cheeks burn or flush easily, book a dermatologist.'),

      // Hair and grooming
      habit('hair', 'Hair: wash and style', ALL, {
        note: lines(
          'Shampoo + condition Tue, Thu, Sat, Sun (any 3 to 4 days is fine); rinse + condition otherwise. Style every time.',
          '2 to 3 sprays of leave-in',
          'Sea salt spray or a palm-sized amount of mousse',
          'Scrunch upward',
          'Air dry, or diffuse on low heat (optional). Hands off while it dries.',
        ),
      }),
      habit('grooming', 'Weekly grooming', [0], {
        note: lines('Brows and stray neck hairs, nose and ear hair, nails.', 'Optional: change the pillowcase and wipe the phone screen (Wednesdays too).'),
      }),
      task('book-barber', '2026-11-28', 'Book first barber appointment', 'First choice: American Haircuts Midtown. Pick a barber who posts scissor work on top.'),
      task('cut-1', '2026-12-05', 'First haircut', `Shape it and start growing out. ${BARBER}`),
      task('cut-2', '2027-01-30', 'Second haircut (shape only)', `Any day Jan 16 to 30; book ahead. ${BARBER}`),
      task('cut-3', '2027-03-27', 'Third haircut (shape only)', `Any day Mar 13 to 27; book ahead. ${BARBER}`),

      // Posture
      habit('posture', 'Posture routine, 8 min', ALL, {
        time: '21:15',
        note: lines(
          'Bodyweight, about 8 minutes.',
          'Chin tucks: 2 × 10, 3 s hold',
          'Wall angels: 2 × 10',
          'Doorway pec stretch: 2 × 30 s / side',
          'Prone Y-T-W raises: 1 × 10 each letter',
          'Optional: dead hang from the bar, 2 × 30 s',
          'Through the day: shoulders back, neck tall.',
        ),
      }),

      // Smile
      habit('floss', 'Floss', ALL, { time: '21:30', note: 'Part of the PM routine.' }),
      task('book-dentist', '2026-12-01', 'Book dentist cleaning', 'For winter break, home (Cornelius) or Atlanta, whichever fits. Has to happen by Jan 9.'),
      task('cleaning', '2027-01-09', 'Dentist cleaning', 'Whitening starts after this.'),
      task('whitening-start', '2027-01-10', 'Start whitening strips', 'Crest 3D Whitestrips or similar; follow the box for daily wear time and number of days. Stop if teeth or gums hurt, restart after a few days.'),
      task('whitening-done', '2027-01-31', 'Whitening course finished'),

      // Wardrobe
      task('closet-audit', '2026-12-06', 'Closet audit', 'Pull anything oversized, stretched, or stained out of regular rotation. Note the sizes that fit well.'),
      task('tees', '2026-12-20', 'Own 5 fitted plain tees', `White ×2, black, gray, navy (e.g. Amazon Essentials Slim-Fit, Rhone, or Buck Mason). ${FIT}`),
      task('jeans', '2026-12-20', 'Own 2 pairs of slim or straight jeans', `Dark wash and light wash. ${FIT}`),
      task('wardrobe-2', '2027-01-31', 'Own wardrobe phase 2', lines(`Five pieces. ${FIT}`, 'Chinos', 'Overshirt or flannel', 'Plain crewneck sweater', 'Plain cold-weather jacket', 'Clean white leather sneakers')),

      // Sleep
      habit('bedtime', 'In bed by 10:15', ALL, { time: '22:15', note: 'For 7.5+ hours before the 5:30 to 5:45 wake-up. It shows up in skin and under-eyes.' }),

      // Progress photos and review
      ...['2026-11-22', '2026-12-20', '2027-01-17', '2027-02-14', '2027-03-14', '2027-04-11', '2027-05-09'].map((d, i) =>
        task(`photos-${d}`, d, i === 0 ? 'Progress photos (baseline)' : 'Progress photos',
          d === '2027-02-14' ? `${PHOTOS} Compare the side photos for posture.` : PHOTOS)),
      task('review', END, 'Review the appearance plan', 'Against the progress photos and logs. Then plan what\'s next and have Claude seed it.'),

      // Lean and strong (existing goal): Monday check-in
      { id: `${LEAN}:weigh-in`, type: 'habit', goalId: LEAN, title: 'Weigh-in', days: [1], startDate: T, amount: 160, unit: 'lb',
        note: 'Rest-day morning, after the bathroom and before eating. Check it off, then tap it to log the real number.' },
      { id: `${LEAN}:waist`, type: 'habit', goalId: LEAN, title: 'Waist at the navel', days: [1], startDate: T, unit: 'in',
        note: 'Right after the weigh-in. Check it off, then tap it to log inches.' },
    ],
  };
})();

// From plans/dylandoingit-brand-plan-brief.md: launch and run @dylandoingit, Nov 21, 2026 to Jan 10, 2027.
const brandBlock = (() => {
  const T = '2026-11-21';
  const B = 'seed:dylandoingit';
  const lines = (...l) => l.join('\n');

  const CAPTION = 'Caption: line 1 extends the hook, 2-4 short lines of specifics, 1 question, 3-5 specific hashtags.';
  const PRIVACY = 'Privacy: no routes or maps near campus (pace, distance, HR only), no last name, no school name ("CS student"), check frames for building names, room numbers, schedules. Tag locations only after leaving.';
  const REEL = lines(
    'Hook in the first 1.5 s: on-screen text + motion already happening, no intro. Title it "doing ___".',
    'Length: montage 7-20 s; talking or recipe 30-60 s. Cut every dead second.',
    'Cover: a frame from the video + the title, same spot every time.',
    'Audio: voiceover or own audio; trending audio low under b-roll; no other app\'s watermark.',
    CAPTION, PRIVACY, 'Reply to every comment within 1 hr of posting.',
  );
  const CAROUSEL = lines(
    'Title it "doing ___". Same Lightroom preset on every photo.',
    'Recipe: end on a recipe card (ingredients, protein per serving). Workout: end on a workout card (exercises, sets, reps).',
    'Sunday recap: miles, lifts, steps, sleep, one photo per day.',
    CAPTION, PRIVACY, 'Reply to every comment within 1 hr of posting.',
  );

  const task = (slug, date, title, note, extra = {}) => ({
    id: `${B}:t:${slug}`, type: 'task', goalId: B, title, ...(note && { note }), date, done: false, ...extra,
  });
  // A feed post: counts toward the weekly "posts" measure. `extra` (optional) leads the note.
  const post = (date, kind, what, extra) =>
    task(`post-${date}`, date, `${kind}: ${what}`, extra ? `${extra}\n${kind === 'Reel' ? REEL : CAROUSEL}` : kind === 'Reel' ? REEL : CAROUSEL,
      { amount: 1, unit: 'posts' });
  const habit = (slug, title, days, extra = {}) => ({
    id: `${B}:${slug}`, type: 'habit', goalId: B, title, days, startDate: '2026-11-30', ...extra,
  });
  const AWAY = 'Assumes a home kitchen. If you\'re not home, swap to a dining hall or dorm build.';

  return {
    id: '2026-11-21-dylandoingit',
    records: [
      {
        id: B, type: 'goal', name: '@dylandoingit', title: 'Launch @dylandoingit and post 6 a week', color: 'purple',
        date: '2026-11-30', endDate: '2027-01-10', createdAt: T,
        measure: { unit: 'posts', target: 6, per: 'week' },
        note: 'Launch Mon Nov 30, then 6 feed posts a week (4 reels, 2 carousels), stories on 4+ days, and 2+ finished posts banked at all times. Late post? Move it to that week\'s Saturday (edit its date); that isn\'t a miss. Optional extras: Sunday and Wednesday evening edit sessions (90 min each), one Trial Reel a week testing a second hook, 10 min of real comments on niche accounts a day. Goal for January: higher average watch time and sends per reach than the first 4 weeks.',
        path: [
          { name: 'Setup', start: T, end: '2026-11-29', note: 'Account, bio, preset, and gear by Nov 22. Bank 6 posts by Nov 29. Launch carousels Sat and Sun.', target: 2 },
          { name: 'Week 1', start: '2026-11-30', end: '2026-12-06', note: 'Launch reel Monday. Standard week.', target: 6 },
          { name: 'Week 2', start: '2026-12-07', end: '2026-12-13', note: 'Standard week.', target: 6 },
          { name: 'Week 3: Finals', start: '2026-12-14', end: '2026-12-20', note: 'LING Mon, MATH Tue 6-8:50pm, CS Wed 8-10:50am. Mostly banked posts, no Wednesday edit session.', target: 4 },
          { name: 'Week 4: Break', start: '2026-12-21', end: '2026-12-27', note: 'No post on Christmas.', target: 5 },
          { name: 'Week 5: Race week', start: '2026-12-28', end: '2027-01-03', note: 'Race-day stories Friday, race reel Saturday.', target: 6 },
          { name: 'Week 6', start: '2027-01-04', end: '2027-01-10', note: 'Monthly review Monday, then a standard week.', target: 6 },
        ],
      },

      // Setup: due by Sun Nov 22 (dated Nov 21; the app's one-day grace runs through the 22nd).
      task('creator-account', T, 'Switch @dylandoingit to a Creator account'),
      task('profile', T, 'Set name, bio, and profile photo', 'Name field: "Dylan | doing it". No last name anywhere, no school name in the bio (say "CS student").'),
      task('preset', T, 'Build the Lightroom preset and reel cover template', lines(
        'Pick one accent: clay #B5673E or olive #6B7A4B. Base: off-white #F4F1EA, near-black #1C1C1C.',
        'One neutral sans (Inter or Helvetica Neue), lowercase, one line per beat.',
        'Keep text out of the bottom ~20% and the right edge of reels.',
        'Same preset on every photo, same filter on every reel. Grade and crop only, no body modification.',
      )),
      task('gear', T, 'Order a phone tripod and wireless lav mic', lines(
        'Budget about $50 total.',
        'Tripod with a clamp and flexible legs.',
        'Wireless lav with a Lightning receiver (iPhone 14 is Lightning, not USB-C).',
      )),
      task('bank-6', '2026-11-28', 'Bank 6 finished posts', lines(
        'Due Sun Nov 29.',
        'Launch: "The doing list" carousel, Banana Apple Pie Oats recipe card, 5:30am day-in-the-life reel.',
        'Finals week: what I\'m not cutting (reel), 4-day split with almost no equipment (carousel), semester one photo dump (carousel; finish it Sat Dec 19).',
        'Capture: 4K 30 fps for talking and b-roll, 1080p 120 fps slow-mo for lifts and runs. Lock exposure and focus, gridlines on, wipe the lens. Shoot near windows. Edit in Edits (or CapCut), photos in Lightroom.',
      )),

      // Launch
      post('2026-11-28', 'Carousel', 'The doing list', 'What I\'m working on: sub-2 half on Jan 1, building apps, cooking more.'),
      post('2026-11-29', 'Carousel', 'Banana Apple Pie Oats recipe card'),
      post('2026-11-30', 'Reel', 'Doing a 5:30am day as a CS student', 'Launch post. Day-in-the-life with voiceover. Must be live today.'),

      // Week 1
      post('2026-12-01', 'Reel', 'Doing a high-protein plate at the dining hall'),
      post('2026-12-02', 'Reel', 'Doing push day with one cable machine'),
      post('2026-12-03', 'Carousel', 'What I eat in a day on a meal plan', 'Rough protein per meal.'),
      post('2026-12-04', 'Reel', 'Rebuilding from 5 miles a week', 'Night run with a pace/HR overlay. No map near campus.'),
      post('2026-12-06', 'Carousel', 'Week 1, done'),

      // Week 2
      post('2026-12-07', 'Reel', 'Doing a study day', 'Desk setup, focus blocks, timelapse + voiceover. Check frames for schedules and room numbers.'),
      post('2026-12-08', 'Reel', 'Doing a Greek yogurt bowl that hits 40 g protein'),
      post('2026-12-09', 'Reel', 'Doing pull day, cable only'),
      post('2026-12-10', 'Carousel', 'Dorm fridge staples for hitting protein'),
      post('2026-12-11', 'Reel', 'Easy run at Piedmont Park', 'Scenic + data overlay. The map is OK here (off campus).'),
      post('2026-12-13', 'Carousel', 'Week 2, done'),

      // Week 3: finals
      post('2026-12-14', 'Reel', 'Finals week: what I\'m not cutting', 'Banked. Sleep, lifts, runs.'),
      post('2026-12-16', 'Reel', 'Last final done, straight to a run', 'Shoot it live, simple cut.'),
      post('2026-12-18', 'Carousel', 'My 4-day split with almost no equipment', 'Banked. Workout card on the last slide.'),
      post('2026-12-20', 'Carousel', 'Semester one, done: photo dump', 'Banked photos; finish it Saturday.'),

      // Week 4: break
      post('2026-12-21', 'Reel', 'First morning of break, still up at 5:30'),
      post('2026-12-22', 'Reel', 'First real kitchen in four months: high-protein dinner', AWAY),
      post('2026-12-23', 'Reel', 'Doing training away from my gym'),
      post('2026-12-24', 'Carousel', 'A holiday recipe I make', `Add it to the Recipe Bank. ${AWAY}`),
      post('2026-12-27', 'Carousel', 'Week 4, done', 'Plus "half marathon in 5 days".'),

      // Week 5: race week
      post('2026-12-28', 'Reel', 'Half marathon Friday, from a low base: honest taper week'),
      post('2026-12-29', 'Reel', 'What I\'m eating before a half marathon'),
      post('2026-12-30', 'Carousel', '2026 done / 2027 doing list'),
      post('2026-12-31', 'Reel', 'Last day of 2026, montage'),
      task('race-stories', '2027-01-01', 'Race-day stories', 'Start line, watch screen at the mile markers, finish. No route map near campus.'),
      post('2027-01-02', 'Reel', 'Doing a half marathon on New Year\'s Day', 'Splits overlay. Post it regardless of finish time.'),
      post('2027-01-03', 'Carousel', 'Race recap', 'Splits, what went right and wrong, what\'s next.'),

      // Week 6
      task('monthly-review', '2027-01-04', 'Monthly review, 30 min', lines(
        'Rank all posts. Make more of the top 20% formats; cut or rework the bottom 20%. Adjust next month\'s template.',
        'This sets the watch-time and sends baseline for January.',
        'Then ask Claude to seed the next stretch (the plan ends Jan 10).',
      )),
      post('2027-01-04', 'Reel', 'Spring semester reset', 'Room, schedule, goals.'),
      post('2027-01-05', 'Reel', 'Plate build: rating the dining hall\'s protein options'),
      post('2027-01-06', 'Reel', 'First lift after the half'),
      post('2027-01-07', 'Carousel', 'Recipe card from the Recipe Bank'),
      post('2027-01-08', 'Reel', 'First run after the half: recovery in the data'),
      post('2027-01-10', 'Carousel', 'Week 6, done'),

      // Recurring from Nov 30 (the goal's end date, Jan 10, stops them)
      habit('capture', 'Capture 3 clips', [0, 1, 2, 3, 4, 5, 6], {
        note: 'Wide, action, detail; 5-10 s each. Rear camera on the tripod; front camera only for quick handheld.',
      }),
      habit('stories-check', 'Stories on 4+ days this week', [0], {
        note: 'Count this week\'s story days (1-3 frames each). Check it off only if it\'s 4 or more.',
      }),
      habit('weekly-review', 'Weekly review, 15 min', [0], {
        time: '20:00',
        note: lines(
          'Log each post: views, average watch time, sends per reach, saves, follows.',
          'Name the top post.',
          'Count banked posts: keep 2 or more in reserve.',
        ),
      }),
    ],
  };
})();

export const SEEDS = [halfMarathonBlock, appearanceBlock, brandBlock];
