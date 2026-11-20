// Local-date helpers. Always build the day string from local parts:
// toISOString() is UTC and drifts a day near midnight in most timezones.

export const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const today = () => iso(new Date());

// A YYYY-MM-DD string as a local Date (not UTC).
export const dayParts = (isoStr) => {
  const [y, m, d] = isoStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (isoStr, n) => {
  const d = dayParts(isoStr);
  d.setDate(d.getDate() + n);
  return iso(d);
};

// 0 = Sun ... 6 = Sat, like Date#getDay.
export const weekday = (isoStr) => dayParts(isoStr).getDay();

// Monday on or before the date (weeks run Mon to Sun).
export const weekStart = (isoStr) => addDays(isoStr, -((weekday(isoStr) + 6) % 7));

// b minus a, in whole days. UTC on both sides so a DST change can't shift it.
export const daysBetween = (a, b) => {
  const utc = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(b) - utc(a)) / 86400000);
};
