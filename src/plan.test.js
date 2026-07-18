import assert from 'node:assert';
import { PLAN } from './plan.js';

// 28 weeks × 5 run days = 140 run tasks; strength split one todo per exercise.
assert.equal(PLAN.filter((t) => t.id.endsWith('-run')).length, 140);
assert.equal(PLAN.length, 552);

const ids = new Set();
for (const t of PLAN) {
  assert.match(t.id, /^plan-\d{4}-\d{2}-\d{2}-(run|strength-\d+)$/, `bad id: ${t.id}`);
  assert.equal(ids.has(t.id), false, `duplicate id: ${t.id}`); // ids must be unique for idempotent seeding
  ids.add(t.id);
  assert.match(t.date, /^\d{4}-\d{2}-\d{2}$/, `bad date: ${t.date}`);
  assert.ok(t.date >= '2026-07-20' && t.date <= '2027-01-31', `date out of range: ${t.date}`);
  assert.ok(t.text.length > 0, `empty text on ${t.id}`);
  assert.equal(t.done, false);
}

// Bookends: first day has split strength exercises (Mon), last day is the 50K race.
assert.ok(PLAN.some((t) => t.id === 'plan-2026-07-20-strength-0'));
assert.ok(PLAN.some((t) => t.id === 'plan-2027-01-31-run' && /RACE: 50K/.test(t.text)));

console.log('plan.test.js: all assertions passed');
