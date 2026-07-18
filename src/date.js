// Local-date helpers. Always build the day string from local parts —
// toISOString() is UTC and drifts a day near midnight in most timezones.

export const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const today = () => iso(new Date());

// Grid geometry for a month: weekday of the 1st (0=Sun) + number of days.
export const monthInfo = (y, m) => ({
  firstWeekday: new Date(y, m, 1).getDay(),
  count: new Date(y, m + 1, 0).getDate(),
});

// Human labels for a YYYY-MM-DD string (parsed as local, not UTC).
export const dayParts = (isoStr) => {
  const [y, m, d] = isoStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};
