import assert from 'node:assert';

// Browser stand-ins: storage, prompt, and a server that only accepts 'right'.
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
const prompts = [];
let answer = null;
globalThis.window = { prompt: (msg) => (prompts.push(msg), answer) };
globalThis.fetch = async (_url, { headers }) =>
  headers['x-sync-key'] === 'right' ? { ok: true, status: 200, json: async () => [] } : { ok: false, status: 401, json: async () => ({}) };

const { pull, storedKey } = await import('./sync.js');

// A stored passphrase the server rejects: forget it, ask again, keep the new one.
store.set('syncKey', 'wrong');
answer = 'right';
assert.deepStrictEqual(await pull(), []);
assert.equal(storedKey(), 'right');
assert.match(prompts.at(-1), /rejected/);

// Rejected again: no key stays stored (so the app falls back to local-only).
store.set('syncKey', 'wrong');
answer = 'also wrong';
assert.equal(await pull(), null);
assert.equal(storedKey(), null);

// Dismissing the prompt stops asking for the rest of the session.
answer = null;
const before = prompts.length;
assert.equal(await pull(), null);
assert.equal(await pull(), null);
assert.equal(prompts.length, before + 1);

console.log('sync.test.js: all assertions passed');
