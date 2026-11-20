// Canvas "Due soon" data on the client: day grouping (pure) plus a small cached fetch of
// /api/calendar. Read-only; nothing here touches records, score, or goals.
import { addDays, dayParts, iso } from './date.js';
import { fmtDate } from './words.js';
import { storedKey } from './sync.js';

const CACHE = 'canvasCache';
const FRESH_MS = 15 * 60 * 1000;
const BASE = import.meta.env?.VITE_SYNC_URL || '';
const pad = (n) => String(n).padStart(2, '0');

// Local day and HH:MM for an event (Canvas sends UTC; 11:59 PM local stays on its own day).
function local(e) {
  if (e.allDay) return { date: e.date, time: null };
  const d = new Date(e.start);
  return { date: iso(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

// The next 14 local days, grouped by day. Timed events already past are dropped.
export function dueGroups(events, today, nowMs) {
  const last = addDays(today, 13);
  const tomorrow = addDays(today, 1);
  const byDate = new Map();
  for (const e of events) {
    const { date, time } = local(e);
    if (date < today || date > last || (!e.allDay && Date.parse(e.start) < nowMs)) continue;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push({ ...e, time });
  }
  return [...byDate.keys()].sort().map((date) => ({
    date,
    label:
      date === today
        ? 'Today'
        : date === tomorrow
          ? 'Tomorrow'
          : `${dayParts(date).toLocaleDateString('en-US', { weekday: 'short' })} ${fmtDate(date)}`,
    events: byDate
      .get(date)
      .sort((a, b) => (a.time ? 0 : 1) - (b.time ? 0 : 1) || (a.time ?? '').localeCompare(b.time ?? '') || a.title.localeCompare(b.title)),
  }));
}

export function readCanvas() {
  try {
    return JSON.parse(localStorage.getItem(CACHE));
  } catch {
    return null;
  }
}

// Refetch at most every 15 minutes. 404 = feed not configured (panel hides); any other
// failure keeps the last good copy.
export async function fetchCanvas(force = false) {
  const cache = readCanvas();
  if (!force && cache && Date.now() - cache.at < FRESH_MS) return cache;
  const key = storedKey();
  if (!key) return cache;
  try {
    const res = await fetch(`${BASE}/api/calendar`, { headers: { 'x-sync-key': key } });
    let next;
    if (res.ok) next = { at: Date.now(), status: 'ok', events: (await res.json()).events ?? [] };
    else if (res.status === 404) next = { at: Date.now(), status: 'off', events: [] };
    else return cache;
    localStorage.setItem(CACHE, JSON.stringify(next));
    return next;
  } catch {
    return cache;
  }
}
