import assert from 'node:assert';
import { SEEDS } from './seed.js';
import { seedErrors } from './records.js';
assert.deepStrictEqual(seedErrors(SEEDS), []);
console.log(`seed.test.js: all assertions passed (${SEEDS.length} batches)`);
