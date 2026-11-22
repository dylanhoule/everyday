import assert from 'node:assert';

// Browser stand-ins: storage, prompt, and a server that only accepts 'right'.
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
const prompts = [];
let answer = null;
globalThis.window = { prompt: (msg) => (prompts.push(msg), answer) };
const puts = [];
let up = true; // whether the server is reachable
globalThis.fetch = async (_url, { method = 'GET', headers, body }) => {
  if (!up) throw new TypeError('offline');
  if (headers['x-sync-key'] !== 'right') return { ok: false, status: 401, json: async () => ({}) };
  if (method === 'PUT') puts.push(JSON.parse(body));
  return { ok: true, status: 200, json: async () => [] };
};

const { pull, push, flush, storedKey, syncFailed, onSyncChange } = await import('./sync.js');

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

// A save that fails is kept and retried by the next flush; the failure shows until it goes through.
store.set('syncKey', 'right');
assert.deepStrictEqual(await pull(), []); // clear the failed pulls above
let changes = 0;
onSyncChange(() => changes++);
up = false;
push([{ id: 'a', updatedAt: 1 }]);
await flush();
assert.equal(puts.length, 0);
assert.equal(syncFailed(), true);
assert.ok(changes > 0);
up = true;
await flush();
assert.deepStrictEqual(puts, [[{ id: 'a', updatedAt: 1 }]]);
assert.equal(syncFailed(), false);
await flush(); // nothing left to send
assert.equal(puts.length, 1);

// A failed pull shows as not synced until a pull succeeds.
up = false;
assert.equal(await pull(), null);
assert.equal(syncFailed(), true);
up = true;
assert.deepStrictEqual(await pull(), []);
assert.equal(syncFailed(), false);

console.log('sync.test.js: all assertions passed');
