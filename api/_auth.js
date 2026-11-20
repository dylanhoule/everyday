// Shared passphrase check for the api/ functions (x-sync-key vs SYNC_SECRET).
// Files starting with _ in api/ are not routes on Vercel.
import crypto from 'node:crypto';

export function authed(req) {
  const secret = process.env.SYNC_SECRET || '';
  const given = String(req.headers['x-sync-key'] || '');
  if (!secret) return false; // refuse if the server secret isn't configured
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
