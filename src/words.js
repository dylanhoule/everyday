// Copy helpers: number words and short time/date labels.
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const numberWord = (n) => WORDS[n] ?? String(n);
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// '17:30' -> '5:30p'; no time -> 'all day'.
export function fmtTime(hhmm) {
  if (!hhmm) return 'all day';
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}${h < 12 ? 'a' : 'p'}`;
}

export function fmtDate(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

// 'Dec 14 to 16' within a month, 'Dec 30 to Jan 2' across months.
export function rangeLabel(a, b) {
  return a.slice(0, 7) === b.slice(0, 7) ? `${fmtDate(a)} to ${Number(b.slice(8))}` : `${fmtDate(a)} to ${fmtDate(b)}`;
}
