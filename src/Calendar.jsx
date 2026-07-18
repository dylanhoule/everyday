import { useMemo, useRef, useState } from 'react';
import TodoItem from './TodoItem.jsx';
import { iso, today, monthInfo, dayParts } from './date.js';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function Calendar({ todos, onAdd, onToggle, onEdit, onDelete }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-11
  const [selected, setSelected] = useState(today());
  const inputRef = useRef(null);

  // date -> { open, done } counts, for the day dots.
  const counts = useMemo(() => {
    const m = new Map();
    for (const t of todos) {
      const c = m.get(t.date) || { open: 0, done: 0 };
      t.done ? c.done++ : c.open++;
      m.set(t.date, c);
    }
    return m;
  }, [todos]);

  const { firstWeekday, count } = monthInfo(year, month);
  const cells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: count }, (_, i) => i + 1),
  ];

  const step = (delta) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const submit = (e) => {
    e.preventDefault();
    const text = inputRef.current.value.trim();
    if (text) {
      onAdd(text, selected);
      inputRef.current.value = '';
    }
    inputRef.current.focus();
  };

  const dayTasks = todos.filter((t) => t.date === selected);
  const selDate = dayParts(selected);
  const selLabel = `${selDate.toLocaleDateString(undefined, { weekday: 'long' })} · ${selDate.toLocaleDateString(
    undefined,
    { month: 'short', day: 'numeric' }
  )}`;

  return (
    <>
      <section className="cal" aria-label="Calendar">
        <div className="cal-head">
          <button className="cal-nav" aria-label="Previous month" onClick={() => step(-1)}>
            ‹
          </button>
          <h2 className="cal-title">
            {MONTHS[month]} {year}
          </h2>
          <button className="cal-nav" aria-label="Next month" onClick={() => step(1)}>
            ›
          </button>
        </div>

        <div className="cal-weekdays" aria-hidden="true">
          {WEEKDAYS.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>

        <div className="cal-grid">
          {cells.map((day, i) => {
            if (day === null) return <span key={`b${i}`} className="cal-cell empty" />;
            const cellIso = iso(new Date(year, month, day));
            const c = counts.get(cellIso);
            const cls = [
              'cal-cell',
              cellIso === today() ? 'today' : '',
              cellIso === selected ? 'sel' : '',
            ].join(' ');
            return (
              <button
                key={cellIso}
                className={cls}
                aria-label={dayParts(cellIso).toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
                aria-pressed={cellIso === selected}
                onClick={() => setSelected(cellIso)}
              >
                <span className="cal-num">{day}</span>
                {c && <span className={`cal-dot ${c.open ? '' : 'alldone'}`} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </section>

      <p className="group-label">{selLabel}</p>

      <form className="add" onSubmit={submit}>
        <input
          ref={inputRef}
          className="add-input"
          type="text"
          placeholder="Add for this day…"
          enterKeyHint="done"
          autoComplete="off"
        />
      </form>

      {dayTasks.length === 0 ? (
        <p className="empty">No tasks on this day yet.</p>
      ) : (
        <ul className="list">
          {dayTasks.map((t) => (
            <TodoItem key={t.id} todo={t} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </>
  );
}
