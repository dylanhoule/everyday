// Cross-device sync: pull the shared task blob on open/focus, push (debounced)
// on write. One shared passphrase gates the endpoint — entered once per device,
// stored locally, never shipped in the bundle. Fail-soft: offline is a no-op.

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

// GET the remote task array. Returns null on any failure (offline, 401, ...). A passphrase the
// server rejects is forgotten and asked for once more, so a wrong one can't stick forever.
export async function pull() {
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
// Debounced PUT of the local task array; coalesces rapid edits into one write.
export function push(todos) {
  const key = getKey();
  if (!key) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    fetch(ENDPOINT, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'x-sync-key': key },
      body: JSON.stringify(todos),
    }).catch(() => {}); // fail-soft; the next trigger retries
  }, 1000);
}
