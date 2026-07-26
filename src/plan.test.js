import assert from 'node:assert';
import { PLAN, PLAN_VERSION } from './plan.js';

// Plan-agnostic: holds for any generated plan, so `npm test` stays green after re-seeding.
assert.ok(PLAN.length > 0, 'PLAN is empty');
assert.ok(typeof PLAN_VERSION === 'string' && PLAN_VERSION.length > 0, 'missing PLAN_VERSION');

const ids = new Set();
for (const t of PLAN) {
  assert.match(t.id, /^plan-\d{4}-\d{2}-\d{2}-(run|strength-\d+)$/, `bad id: ${t.id}`);
  assert.equal(ids.has(t.id), false, `duplicate id: ${t.id}`); // ids must be unique for idempotent seeding
  ids.add(t.id);
  assert.match(t.date, /^\d{4}-\d{2}-\d{2}$/, `bad date: ${t.date}`);
  assert.ok(t.text.length > 0, `empty text on ${t.id}`);
  assert.equal(t.done, false);
}

console.log(`plan.test.js: all assertions passed (${PLAN.length} tasks, v${PLAN_VERSION})`);
