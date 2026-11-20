// Vercel serverless function: the shared task store for cross-device sync.
// GET  → the current task array (or []).   PUT → replace it with the request body.
// Gated by a single shared passphrase (x-sync-key vs SYNC_SECRET) — proportionate
// for a private todo list, no accounts. Storage is Upstash Redis (one key).
import { Redis } from '@upstash/redis';
import { authed } from './_auth.js';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});
const KEY = 'todos:v1';

export default async function handler(req, res) {
  // If the app is hosted off-Vercel, uncomment CORS and set VITE_SYNC_URL client-side:
  // res.setHeader('Access-Control-Allow-Origin', 'https://your-app-host');
  // res.setHeader('Access-Control-Allow-Headers', 'content-type, x-sync-key');
  // res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  // if (req.method === 'OPTIONS') return res.status(204).end();

  if (!authed(req)) return res.status(401).json({ error: 'bad key' });

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
    await redis.set(KEY, body);
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'method not allowed' });
}
