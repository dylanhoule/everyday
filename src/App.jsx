import { useEffect, useRef, useState } from 'react';
import TodoItem from './TodoItem.jsx';
import Calendar from './Calendar.jsx';
import { today } from './date.js';

const KEY = 'todos';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    // Backfill legacy undated items to today so they still show on Home.
    return raw ? JSON.parse(raw).map((t) => (t.date ? t : { ...t, date: today() })) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [todos, setTodos] = useState(load);
  const [showDone, setShowDone] = useState(false);
  const [view, setView] = useState('today'); // 'today' | 'calendar'
  const inputRef = useRef(null);

  // Persist on every mutation.
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(todos));
  }, [todos]);

  const add = (text, date = today()) =>
    setTodos((t) => [{ id: crypto.randomUUID(), text, done: false, date }, ...t]);
  const toggle = (id) =>
    setTodos((t) => t.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  const remove = (id) => setTodos((t) => t.filter((x) => x.id !== id));
  const edit = (id, text) =>
    text.trim()
      ? setTodos((t) => t.map((x) => (x.id === id ? { ...x, text: text.trim() } : x)))
      : remove(id);

  const submit = (e) => {
    e.preventDefault();
    const text = inputRef.current.value.trim();
    if (text) {
      add(text);
      inputRef.current.value = '';
    }
    inputRef.current.focus(); // stay focused for rapid entry
  };

  const iso = today();
  // Home: today's open tasks + unfinished from earlier days (overdue first).
  const active = todos
    .filter((t) => !t.done && t.date <= iso)
    .sort((a, b) => a.date.localeCompare(b.date));
  const doneToday = todos.filter((t) => t.done && t.date === iso);
  const total = active.length + doneToday.length;
  const pct = total ? Math.round((doneToday.length / total) * 100) : 0;
  const now = new Date();
  const date = `${now.toLocaleDateString(undefined, { weekday: 'short' })} · ${now.toLocaleDateString(
    undefined,
    { month: 'short', day: 'numeric' }
  )}`;

  return (
    <div className="app">
      <header className="head">
        <p className="eyebrow accent">Everyday</p>
        <h1 className="date">{date}</h1>
        <p className="subline">
          {total === 0 ? 'A clean slate' : `${active.length} to do · ${doneToday.length} done`}
        </p>
      </header>

      <nav className="viewtabs" aria-label="View">
        <button
          className={`viewtab ${view === 'today' ? 'on' : ''}`}
          aria-pressed={view === 'today'}
          onClick={() => setView('today')}
        >
          Today
        </button>
        <button
          className={`viewtab ${view === 'calendar' ? 'on' : ''}`}
          aria-pressed={view === 'calendar'}
          onClick={() => setView('calendar')}
        >
          Calendar
        </button>
      </nav>

      {view === 'calendar' ? (
        <Calendar
          todos={todos}
          onAdd={add}
          onToggle={toggle}
          onEdit={edit}
          onDelete={remove}
        />
      ) : (
        <>
          <section className="hero" aria-label="Today's progress">
            <span className="ring ring-1" aria-hidden="true" />
            <span className="ring ring-2" aria-hidden="true" />
            <span className="ring ring-3" aria-hidden="true" />
            <p className="eyebrow">Today's progress</p>
            <p className="hero-num">{active.length}</p>
            <p className="hero-cap">
              {total === 0
                ? 'add a task to begin'
                : active.length === 0
                  ? 'all done — nice work'
                  : `${active.length === 1 ? 'task' : 'tasks'} left today`}
            </p>
            <div className="stats">
              <div className="stat">
                <span className="stat-n">{doneToday.length}</span>
                <span className="stat-l">DONE</span>
              </div>
              <div className="stat">
                <span className="stat-n">{total}</span>
                <span className="stat-l">TOTAL</span>
              </div>
              <div className="stat">
                <span className="stat-n">{pct}%</span>
                <span className="stat-l">COMPLETE</span>
              </div>
            </div>
          </section>

          <form className="add" onSubmit={submit}>
            <input
              ref={inputRef}
              className="add-input"
              type="text"
              placeholder="Add a task…"
              autoFocus
              enterKeyHint="done"
              autoComplete="off"
            />
          </form>

          {active.length === 0 && doneToday.length === 0 ? (
            <p className="empty">Nothing today yet. Add your first task above.</p>
          ) : (
            active.length > 0 && (
              <>
                <p className="group-label">To do</p>
                <ul className="list">
                  {active.map((t) => (
                    <TodoItem key={t.id} todo={t} onToggle={toggle} onEdit={edit} onDelete={remove} />
                  ))}
                </ul>
              </>
            )
          )}

          {doneToday.length > 0 && (
            <section className="done-section">
              <button className="done-header" onClick={() => setShowDone((s) => !s)}>
                <span className={`chevron ${showDone ? 'open' : ''}`}>▸</span>
                Completed ({doneToday.length})
              </button>
              {showDone && (
                <ul className="list">
                  {doneToday.map((t) => (
                    <TodoItem key={t.id} todo={t} onToggle={toggle} onEdit={edit} onDelete={remove} />
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
