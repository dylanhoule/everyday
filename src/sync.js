// Cross-device sync: pull the shared task blob on open/focus, push (debounced)
// on write. One shared passphrase gates the endpoint — entered once per device,
// stored locally, never shipped in the bundle. Fail-soft: offline is a no-op.

const KEY_STORE = 'syncKey';
// Same-origin by default (app + api/ on one Vercel project). Set VITE_SYNC_URL
// only if the app is hosted somewhere other than the API (then enable CORS too).
const ENDPOINT = `${import.meta.env?.VITE_SYNC_URL || ''}/api/todos`;

// The saved passphrase, without prompting.
export const storedKey = () => localStorage.getItem(KEY_STORE)?.trim() || null;

// Read the passphrase, prompting once if unset. Returns null if dismissed.
export function getKey() {
  let k = localStorage.getItem(KEY_STORE);
  if (!k) {
    k = window.prompt('Sync passphrase (use the same on all your devices):');
    if (k && k.trim()) localStorage.setItem(KEY_STORE, k.trim());
  }
  return k && k.trim() ? k.trim() : null;
}

// GET the remote task array. Returns null on any failure (offline, 401, …).
export async function pull() {
  const key = getKey();
  if (!key) return null;
  try {
    const res = await fetch(ENDPOINT, { headers: { 'x-sync-key': key } });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
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
