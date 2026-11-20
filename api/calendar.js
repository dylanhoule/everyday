// Vercel serverless function: upcoming Canvas assignments and events for the Due soon panel.
// GET -> { events } for roughly the next two weeks. Read-only.
// CANVAS_ICS_URL is the private Canvas calendar feed link (Canvas: Calendar, "Calendar Feed").
// It lives only in Vercel's environment variables; anyone with it can read the calendar, so it
// never goes to the client. Gated by the same passphrase as api/todos.js.
import { authed } from './_auth.js';
import { parseICS, upcoming } from '../src/ics.js';

export default async function handler(req, res) {
  if (!authed(req)) return res.status(401).json({ error: 'bad key' });
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method not allowed' });
  }
  const url = process.env.CANVAS_ICS_URL;
  if (!url) return res.status(404).json({ error: 'not configured' });
  try {
    const feed = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!feed.ok) throw new Error(`feed ${feed.status}`);
    return res.status(200).json({ events: upcoming(parseICS(await feed.text()), Date.now()) });
  } catch {
    return res.status(502).json({ error: 'feed unavailable' });
  }
}
