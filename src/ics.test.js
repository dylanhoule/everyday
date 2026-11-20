import assert from 'node:assert';
import { parseICS, upcoming } from './ics.js';

const feed = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VTIMEZONE',
  'TZID:America/New_York',
  'END:VTIMEZONE',
  'BEGIN:VEVENT',
  'UID:event-assignment-1',
  'DTSTART:20261215T045900Z',
  'SUMMARY:Project 3 outline [ENGL-1102-A]',
  'URL;VALUE=URI:https://canvas.example.edu/courses/1/assignments/2',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:event-2',
  'DTSTART;VALUE=DATE:20261214',
  'SUMMARY:Final exam\\, LING [LING-2001]',
  'DESCRIPTION:See https://canvas.example.edu/courses/9/calendar_events/5 for d',
  ' etails\\nRoom 101',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:event-3',
  'DTSTART;TZID=America/New_York:20261216T090000',
  'SUMMARY:Office hours',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

assert.deepStrictEqual(parseICS(feed), [
  { uid: 'event-assignment-1', title: 'Project 3 outline', course: 'ENGL-1102-A', allDay: false,
    start: '2026-12-15T04:59:00Z', url: 'https://canvas.example.edu/courses/1/assignments/2' },
  { uid: 'event-2', title: 'Final exam, LING', course: 'LING-2001', allDay: true, date: '2026-12-14',
    url: 'https://canvas.example.edu/courses/9/calendar_events/5' },
  { uid: 'event-3', title: 'Office hours', allDay: false, start: '2026-12-16T09:00:00' },
]);
assert.equal(parseICS(feed.replace(/\r\n/g, '\n')).length, 3); // LF-only feeds too
assert.deepStrictEqual(parseICS(''), []);
assert.deepStrictEqual(parseICS('not a calendar'), []);
assert.deepStrictEqual(parseICS(undefined), []);
assert.deepStrictEqual(parseICS('BEGIN:VEVENT\nUID:x\nSUMMARY:no start\nEND:VEVENT'), []); // no DTSTART: skipped
assert.deepStrictEqual(parseICS('BEGIN:VEVENT\nUID:y\nDTSTART:20261201T100000Z\nSUMMARY:cut off'), []); // unterminated

const now = Date.parse('2026-12-10T12:00:00Z');
const old = { uid: 'old', title: 'Old', allDay: true, date: '2026-11-01' };
const far = { uid: 'far', title: 'Far', allDay: true, date: '2027-01-30' };
assert.deepStrictEqual(upcoming([far, ...parseICS(feed), old], now).map((e) => e.uid), ['event-2', 'event-assignment-1', 'event-3']);
const many = Array.from({ length: 500 }, (_, i) => ({ uid: `m${i}`, title: 'M', allDay: true, date: '2026-12-11' }));
assert.equal(upcoming(many, now).length, 200);

console.log('ics.test.js: all assertions passed');
