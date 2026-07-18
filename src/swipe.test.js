import assert from 'node:assert';
import { classifyGesture, shouldDelete } from './swipe.js';

// tiny movement stays a tap
assert.equal(classifyGesture(3, 2), 'tap');
// horizontal dominates -> swipe (either direction)
assert.equal(classifyGesture(40, 5), 'swipe');
assert.equal(classifyGesture(-40, 5), 'swipe');
// vertical dominates -> scroll
assert.equal(classifyGesture(5, 40), 'scroll');
// diagonal with horizontal bigger -> swipe
assert.equal(classifyGesture(30, 20), 'swipe');

// delete only on sufficient leftward travel
assert.equal(shouldDelete(-100), true);
assert.equal(shouldDelete(-50), false);
assert.equal(shouldDelete(100), false);

console.log('swipe.test.js: all assertions passed');
