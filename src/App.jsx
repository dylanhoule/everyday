import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import TodoItem from './TodoItem.jsx';
import Calendar from './Calendar.jsx';
import { today } from './date.js';
import { PLAN, PLAN_VERSION } from './plan.js';
import { merge, purge, retireStale } from './merge.js';
import { pull, push } from './sync.js';

const KEY = 'todos';
const SEED_KEY = 'planSeeded-v1'; // holds the seeded PLAN_VERSION; a new plan re-seeds once
const PLAN_IDS = new Set(PLAN.map((p) => p.id)); // the current plan is the authority on what's live
const DIAL_C = 2 * Math.PI * 52; // circumference of the progress dial

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    // Backfill legacy items: undated → today; done without doneDate → its own date.
    let todos = raw
      ? JSON.parse(raw)
          .map((t) => (t.date ? t : { ...t, date: today() }))
          .map((t) => (t.done && !t.doneDate ? { ...t, doneDate: t.date } : t))
      : [];
    // Seed the plan when its version changes. Only today-or-future items, so seeding
    // mid-plan doesn't flood the Today view.
    if (localStorage.getItem(SEED_KEY) !== PLAN_VERSION) {
      localStorage.setItem(SEED_KEY, PLAN_VERSION);
      const t = today();
      const now = Date.now();
      const upcoming = PLAN.filter((p) => p.date >= t);
      const fresh = new Map(upcoming.map((p) => [p.id, p]));
      // The plan owns the text of its own tasks. Ids are date+kind, so a new plan reuses
      // the ids of the one it replaces — without this the old wording survives forever
      // behind the dedup below. done/deleted stay the user's; the stamp is what beats a
      // stale copy of the old plan still sitting in the sync store.
      todos = todos.map((x) => {
        const p = fresh.get(x.id);
        return p && !x.done && !x.deleted ? { ...x, ...p, updatedAt: now } : x;
      });
      const have = new Set(todos.map((x) => x.id));
      todos = [...upcoming.filter((p) => !have.has(p.id)), ...todos];
    }
    // Retire superseded plan tasks on every load, not just on the version bump: a one-shot
    // pass only sees what localStorage happened to hold at that instant, so anything the
    // old plan had left in the sync store would come back on the next pull and stay.
    // Backfill updatedAt (legacy/seed items lack it → 0, so any real edit wins the
    // merge) and drop stale tombstones.
    todos = retireStale(todos, PLAN_IDS);
    return purge(todos.map((t) => (t.updatedAt ? t : { ...t, updatedAt: 0 })));
  } catch {
    return [];
  }
}

export default function App() {
  const [todos, setTodos] = useState(load);
  const [showDone, setShowDone] = useState(false);
  const [view, setView] = useState('today'); // 'today' | 'calendar'
  const inputRef = useRef(null);

  // Persist on every mutation, and push the blob to the sync store (debounced).
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(todos));
    push(todos);
  }, [todos]);

  // Pull + merge on open and whenever the app regains focus.
  useEffect(() => {
    let cancelled = false;
    const syncNow = async () => {
      const remote = await pull();
      // retireStale again here: the remote blob can still carry a superseded plan's tasks,
      // and merge() would happily bring them back to life.
      if (!cancelled && remote) setTodos((cur) => purge(retireStale(merge(cur, remote), PLAN_IDS)));
    };
    syncNow();
    const onVis = () => document.visibilityState === 'visible' && syncNow();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', syncNow);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', syncNow);
    };
  }, []);

  const add = (text, date = today()) =>
    setTodos((t) => [
      { id: crypto.randomUUID(), text, done: false, date, updatedAt: Date.now() },
      ...t,
    ]);
  const toggle = (id) =>
    setTodos((t) =>
      t.map((x) =>
        x.id === id
          ? { ...x, done: !x.done, doneDate: x.done ? undefined : today(), updatedAt: Date.now() }
          : x
      )
    );
  // Soft delete: keep a tombstone so the delete propagates to other devices.
  const remove = (id) =>
    setTodos((t) => t.map((x) => (x.id === id ? { ...x, deleted: true, updatedAt: Date.now() } : x)));
  const edit = (id, text) =>
    text.trim()
      ? setTodos((t) =>
          t.map((x) => (x.id === id ? { ...x, text: text.trim(), updatedAt: Date.now() } : x))
        )
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
  const live = todos.filter((t) => !t.deleted); // hide tombstones from every view
  // Home: today's open tasks + unfinished from earlier days (overdue first).
  const active = live
    .filter((t) => !t.done && t.date <= iso)
    .sort((a, b) => a.date.localeCompare(b.date));
  // Done on today's date — includes overdue tasks completed today (doneDate, not date).
  const doneToday = live.filter((t) => t.done && t.doneDate === iso);
  const total = active.length + doneToday.length;
  const pct = total ? Math.round((doneToday.length / total) * 100) : 0;
  const allDone = total > 0 && active.length === 0;
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

      <nav className="viewtabs" aria-label="View" data-view={view}>
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

      {/* enter-only view switch: keyed remount slides in, old view unmounts instantly */}
      {view === 'calendar' ? (
        <motion.div
          key="cal"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
            <Calendar
              todos={live}
              onAdd={add}
              onToggle={toggle}
              onEdit={edit}
              onDelete={remove}
            />
          </motion.div>
        ) : (
          <motion.div
            key="today"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <section className="hero" aria-label="Today's progress">
              <span className="ring ring-1" aria-hidden="true" />
              <span className="ring ring-3" aria-hidden="true" />
              <p className="eyebrow">Today's progress</p>
              <div className={`dial ${allDone ? 'complete' : ''}`}>
                <svg className="dial-svg" viewBox="0 0 120 120" aria-hidden="true">
                  <circle className="dial-track" cx="60" cy="60" r="52" />
                  <circle
                    className="dial-fill"
                    cx="60"
                    cy="60"
                    r="52"
                    strokeDasharray={DIAL_C}
                    strokeDashoffset={DIAL_C * (1 - pct / 100)}
                  />
                </svg>
                <div className="dial-center">
                  <span className="hero-num num-window">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={active.length}
                        initial={{ y: '0.8em', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '-0.8em', opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                      >
                        {active.length}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </div>
              </div>
              <p className="hero-cap">
                {total === 0
                  ? 'add a task to begin'
                  : allDone
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

            {active.length > 0 && (
              <>
                <p className="group-label">To do</p>
                <ul className="list">
                  <AnimatePresence initial={false}>
                    {active.map((t) => (
                      <TodoItem
                        key={t.id}
                        todo={t}
                        leaveOnComplete
                        onToggle={toggle}
                        onEdit={edit}
                        onDelete={remove}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              </>
            )}

            {total === 0 && (
              <div className="empty">
                <svg className="empty-mark" viewBox="0 0 48 48" aria-hidden="true">
                  <circle
                    cx="24"
                    cy="24"
                    r="21"
                    fill="none"
                    stroke="var(--check-border)"
                    strokeWidth="2.5"
                    strokeDasharray="4 7"
                    strokeLinecap="round"
                  />
                  <path
                    d="M16 24l6 6 11-12"
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="empty-title">A clean slate</p>
                <p className="empty-sub">Add your first task above.</p>
              </div>
            )}

            {doneToday.length > 0 && (
              <section className="done-section">
                <button
                  className="done-header"
                  aria-expanded={showDone}
                  onClick={() => setShowDone((s) => !s)}
                >
                  <span className={`chevron ${showDone ? 'open' : ''}`} aria-hidden="true">
                    ▸
                  </span>
                  Completed ({doneToday.length})
                </button>
                <AnimatePresence initial={false}>
                  {showDone && (
                    <motion.div
                      key="done"
                      style={{ overflow: 'hidden' }}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
                      exit={{
                        height: 0,
                        opacity: 0,
                        overflow: 'hidden',
                        transition: { duration: 0.18, ease: 'easeIn' },
                      }}
                      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <ul className="list">
                        <AnimatePresence initial={false}>
                          {doneToday.map((t) => (
                            <TodoItem
                              key={t.id}
                              todo={t}
                              onToggle={toggle}
                              onEdit={edit}
                              onDelete={remove}
                            />
                          ))}
                        </AnimatePresence>
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            )}
          </motion.div>
        )}
    </div>
  );
}
