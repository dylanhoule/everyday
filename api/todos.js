// Vercel serverless function: the shared task store for cross-device sync.
// GET  → the current task array (or []).   PUT → merge the request body into it (newest edit wins).
// Gated by a single shared passphrase (x-sync-key vs SYNC_SECRET) — proportionate
// for a private todo list, no accounts. Storage is Upstash Redis (one key).
import { Redis } from '@upstash/redis';
import { authed } from './_auth.js';
import { storeMerge } from '../src/merge.js';

// STORAGE_* is the store connected in Vercel with the custom prefix "STORAGE" (it replaces "KV").
const env = process.env;
const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL || env.STORAGE_REST_API_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN || env.STORAGE_REST_API_TOKEN,
});
const KEY = 'todos:v1';

export default async function handler(req, res) {
  // If the app is hosted off-Vercel, uncomment CORS and set VITE_SYNC_URL client-side:
  // res.setHeader('Access-Control-Allow-Origin', 'https://your-app-host');
  // res.setHeader('Access-Control-Allow-Headers', 'content-type, x-sync-key');
  // res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  // if (req.method === 'OPTIONS') return res.status(204).end();

  if (!authed(req)) return res.status(401).json({ error: 'bad key' });

  try {
    if (req.method === 'GET') {
      const data = await redis.get(KEY); // Upstash returns the parsed value
      return res.status(200).json(Array.isArray(data) ? data : []);
    }

    if (req.method === 'PUT') {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          body = null;
        }
      }
      if (!Array.isArray(body)) return res.status(400).json({ error: 'expected an array' });
      // ponytail: read-then-write isn't atomic; two saves in the same instant can drop one, and that
      // device's next save (it always sends everything) puts it back. Use a Lua script if that ever bites.
      await redis.set(KEY, storeMerge(await redis.get(KEY), body));
      return res.status(200).json({ ok: true });
    }
  } catch (e) {
    // Storage is down or misconfigured: say why (only to passphrase holders) instead of crashing.
    return res.status(502).json({ error: `storage: ${e?.message ?? e}` });
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'method not allowed' });
}
