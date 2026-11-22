// Cross-device sync: pull the shared task blob on open/focus and every minute while
// visible, push (debounced) on write; the server merges each push. One shared passphrase
// gates the endpoint: entered once per device, stored locally, never shipped in the bundle.
// Fail-soft: offline is a no-op, and unsaved changes wait for the next sync.

const KEY_STORE = 'syncKey';
// Same-origin by default (app + api/ on one Vercel project). Set VITE_SYNC_URL
// only if the app is hosted somewhere other than the API (then enable CORS too).
const ENDPOINT = `${import.meta.env?.VITE_SYNC_URL || ''}/api/todos`;

// The saved passphrase, without prompting.
export const storedKey = () => localStorage.getItem(KEY_STORE)?.trim() || null;

let declined = false; // prompt dismissed: don't ask again until the app reloads

// Read the passphrase, prompting if unset. Returns null if dismissed.
export function getKey(message = 'Sync passphrase (use the same on all your devices):') {
  let k = localStorage.getItem(KEY_STORE);
  if (!k && !declined) {
    k = window.prompt(message);
    if (k && k.trim()) localStorage.setItem(KEY_STORE, k.trim());
    else declined = true;
  }
  return k && k.trim() ? k.trim() : null;
}

// Whether the last pull or save failed, for the "Not synced" note. React reads it through
// useSyncExternalStore(onSyncChange, syncFailed).
let pullFailed = false;
let pushFailed = false;
const listeners = new Set();
const report = (pulled, pushed) => {
  pullFailed = pulled;
  pushFailed = pushed;
  listeners.forEach((fn) => fn());
};
export const syncFailed = () => pullFailed || pushFailed;
export const onSyncChange = (fn) => (listeners.add(fn), () => listeners.delete(fn));

export async function pull() {
  const data = await fetchRemote();
  report(data === null, pushFailed);
  return data;
}

// GET the remote task array. Returns null on any failure (offline, 401, ...). A passphrase the
// server rejects is forgotten and asked for once more, so a wrong one can't stick forever.
async function fetchRemote() {
  for (let attempt = 0; attempt < 2; attempt++) {
    const key = getKey(attempt ? 'That passphrase was rejected. Sync passphrase:' : undefined);
    if (!key) return null;
    try {
      const res = await fetch(ENDPOINT, { headers: { 'x-sync-key': key } });
      if (res.status === 401) {
        localStorage.removeItem(KEY_STORE);
        continue;
      }
      if (!res.ok) return null;
      const data = await res.json();
      return Array.isArray(data) ? data : null;
    } catch {
      return null;
    }
  }
  return null;
}

let timer;
let unsaved = null; // the latest records the server hasn't confirmed yet

// Debounced save of the local records; coalesces rapid edits into one write.
export function push(todos) {
  unsaved = todos;
  clearTimeout(timer);
  timer = setTimeout(flush, 1000);
}

// Save now. The records stay queued until the server confirms them, so a save that failed
// (offline, server down) or never went out (app closed mid-debounce) is retried by the next flush.
export async function flush() {
  clearTimeout(timer);
  const body = unsaved;
  const key = body && getKey();
  if (!key) return;
  let ok = false;
  try {
    const res = await fetch(ENDPOINT, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'x-sync-key': key },
      body: JSON.stringify(body),
    });
    ok = res.ok;
  } catch {
    // offline: stays queued
  }
  if (ok && unsaved === body) unsaved = null;
  report(pullFailed, !ok);
}
