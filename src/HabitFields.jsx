import { Field, setOpt, num } from './Sheet.jsx';

const WEEK = [
  [1, 'M', 'Monday'],
  [2, 'T', 'Tuesday'],
  [3, 'W', 'Wednesday'],
  [4, 'T', 'Thursday'],
  [5, 'F', 'Friday'],
  [6, 'S', 'Saturday'],
  [0, 'S', 'Sunday'],
];

export const habitValid = (h) => h.title.trim() !== '' && h.days.length > 0;

// Trim text fields on save; empty optional ones are dropped.
export const cleanHabit = (h) =>
  ['note', 'unit'].reduce((x, k) => setOpt(x, k, x[k]?.trim()), { ...h, title: h.title.trim() });

export default function HabitFields({ habit, onChange }) {
  const set = (k, v) => onChange(setOpt(habit, k, v));
  const toggleDay = (d) =>
    onChange({ ...habit, days: habit.days.includes(d) ? habit.days.filter((x) => x !== d) : [...habit.days, d].sort() });
  return (
    <div className="fields">
      <Field label="Habit" wide>
        <input value={habit.title} placeholder="Run 4× a week" onChange={(e) => onChange({ ...habit, title: e.target.value })} />
      </Field>
      <Field label="Note" wide>
        <textarea rows={3} value={habit.note ?? ''} placeholder="Zone 2, heart rate under 150" onChange={(e) => set('note', e.target.value)} />
      </Field>
      <div className="field field-wide">
        <span className="field-label">Days</span>
        <div className="chips" role="group" aria-label="Days">
          {WEEK.map(([d, letter, name]) => (
            <button
              key={d}
              type="button"
              className={`chip ${habit.days.includes(d) ? 'on' : ''}`}
              aria-pressed={habit.days.includes(d)}
              aria-label={name}
              onClick={() => toggleDay(d)}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>
      <Field label="Time (empty = all day)">
        <input type="time" value={habit.time ?? ''} onChange={(e) => set('time', e.target.value)} />
      </Field>
      <Field label="Amount per check-off">
        <div className="pair">
          <input type="number" min="0" step="any" inputMode="decimal" value={habit.amount ?? ''} placeholder="1" onChange={(e) => set('amount', num(e.target.value))} />
          <input value={habit.unit ?? ''} placeholder="unit" aria-label="Unit" onChange={(e) => set('unit', e.target.value)} />
        </div>
      </Field>
    </div>
  );
}
