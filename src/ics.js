// Minimal iCalendar reader for the Canvas calendar feed: VEVENTs only, the fields the
// Due soon panel shows. Never throws; junk in, [] out.

const DAY_MS = 86400000;

const unescape = (s) => s.replace(/\\([nN,;\\])/g, (_, c) => (c === 'n' || c === 'N' ? '\n' : c));

// DTSTART -> { allDay, date } or { allDay, start }; null if unreadable.
// ponytail: TZID is ignored (wall time kept as written). Canvas sends UTC ('Z') and
// all-day dates, so that's fine; convert zones if another feed ever needs it.
function when(value, params) {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (h === undefined || /VALUE=DATE(;|$)/i.test(params)) return { allDay: true, date: `${y}-${mo}-${d}` };
  return { allDay: false, start: `${y}-${mo}-${d}T${h}:${mi}:${s}${z}` };
}

export function parseICS(text) {
  try {
    const lines = String(text ?? '').replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
    const events = [];
    let cur = null;
    for (const line of lines) {
      if (line === 'BEGIN:VEVENT') cur = {};
      else if (line === 'END:VEVENT') {
        if (cur) events.push(cur);
        cur = null;
      } else if (cur) {
        const colon = line.indexOf(':');
        if (colon < 0) continue;
        const [name, ...params] = line.slice(0, colon).split(';');
        cur[name.toUpperCase()] = { value: line.slice(colon + 1), params: params.join(';') };
      }
    }
    return events.flatMap((p) => {
      const start = p.DTSTART && when(p.DTSTART.value, p.DTSTART.params);
      if (!start) return [];
      const summary = unescape(p.SUMMARY?.value ?? '').trim();
      const course = summary.match(/\s*\[([^\]]+)\]\s*$/); // Canvas: "Project 3 [ENGL-1102]"
      const url = p.URL?.value || unescape(p.DESCRIPTION?.value ?? '').match(/https?:\/\/[^\s]+/)?.[0];
      return [{
        uid: p.UID?.value ?? summary,
        title: course ? summary.slice(0, course.index).trim() : summary,
        ...(course && { course: course[1] }),
        ...start,
        ...(url && { url }),
      }];
    });
  } catch {
    return [];
  }
}

export const eventMs = (e) => (e.allDay ? Date.parse(`${e.date}T00:00:00`) : Date.parse(e.start));

// Events from a day ago through `days` ahead, soonest first, capped so a huge feed stays small.
export function upcoming(events, nowMs, days = 15) {
  return events
    .filter((e) => {
      const t = eventMs(e);
      return t >= nowMs - DAY_MS && t <= nowMs + days * DAY_MS;
    })
    .sort((a, b) => eventMs(a) - eventMs(b))
    .slice(0, 200);
}
