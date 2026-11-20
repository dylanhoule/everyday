import { useEffect, useMemo, useState } from 'react';
import { today as todayIso } from './date.js';
import { migrate, syncStep } from './records.js';
import { SEEDS } from './seed.js';
import { index } from './score.js';
import * as A from './actions.js';
import { purge } from './merge.js';
import { pull, push, storedKey } from './sync.js';
import { fetchCanvas, readCanvas } from './canvas.js';
import Nav from './Nav.jsx';
import Today from './Today.jsx';
import Goals from './Goals.jsx';
import GoalDetail from './GoalDetail.jsx';
import Progress from './Progress.jsx';
import GoalEditor, { HabitSheet } from './GoalEditor.jsx';
import TaskSheet from './TaskSheet.jsx';
import ItemSheet from './ItemSheet.jsx';

const KEY = 'todos'; // the synced record list (name kept from the todo-list days)
// Dev-only sample data: /?demo under `npm run dev`. Never persisted or synced.
const DEMO = import.meta.env.DEV && new URLSearchParams(location.search).has('demo');
const demoModule = DEMO ? import('./demo.js') : null;

function load() {
  if (DEMO) return [];
  try {
    const raw = localStorage.getItem(KEY);
    return purge(migrate(raw ? JSON.parse(raw) : []));
  } catch {
    return [];
  }
}

const WIDE = '(min-width: 900px)';
export function useWide() {
  const [wide, setWide] = useState(() => matchMedia(WIDE).matches);
  useEffect(() => {
    const m = matchMedia(WIDE);
    const on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
}

export default function App() {
  const [records, setRecords] = useState(load);
  const [today, setToday] = useState(todayIso);
  const [nav, setNav] = useState({ view: 'today' });
  const [sheet, setSheet] = useState(null);
  const [canvas, setCanvas] = useState(readCanvas);
  const wide = useWide();

  useEffect(() => {
    demoModule?.then((m) => {
      setRecords(m.demoRecords(todayIso()));
      setCanvas(m.demoCanvas(todayIso()));
    });
  }, []);

  // Persist on every change and push to the sync store (debounced in sync.js).
  useEffect(() => {
    if (DEMO) return;
    localStorage.setItem(KEY, JSON.stringify(records));
    push(records);
  }, [records]);

  // Pull + merge on open and whenever the app comes back. Also roll `today` over:
  // on return after midnight, and once a minute while it stays open.
  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      setToday(todayIso());
      if (DEMO) return;
      const remote = await pull();
      // Seeds apply only after a real pull (so a stale device can't overwrite newer edits),
      // or locally, stamped 0, when this device has no sync at all (see records.js syncStep).
      if (!cancelled)
        setRecords((cur) => syncStep(cur, remote, SEEDS, { hasKey: !!storedKey(), today: todayIso(), now: Date.now() }));
      fetchCanvas().then((c) => !cancelled && c && setCanvas(c));
    };
    sync();
    const onVis = () => document.visibilityState === 'visible' && sync();
    const tick = setInterval(() => setToday(todayIso()), 60_000);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', sync);
    return () => {
      cancelled = true;
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', sync);
    };
  }, []);

  const idx = useMemo(() => index(records), [records]);
  const change = (fn) => setRecords((r) => fn(r, Date.now()));
  const api = {
    idx,
    today,
    wide,
    nav,
    canvas,
    open: (n) => {
      setNav(n);
      window.scrollTo(0, 0);
    },
    openSheet: setSheet,
    closeSheet: () => setSheet(null),
    toggleItem: (item) =>
      change((r, now) =>
        item.kind === 'habit' ? A.toggleHabit(r, item.rec, item.date, today, now) : A.toggleTask(r, item.id, today, now)
      ),
    setAmount: (id, n) => change((r, now) => A.setAmount(r, id, n, today, now)),
    save: (recs) => change((r, now) => recs.reduce((acc, x) => A.upsert(acc, x, now), r)),
    archiveGoal: (id) => change((r, now) => A.archiveGoal(r, id, today, now)),
    removeHabit: (id) => change((r, now) => A.removeHabit(r, id, today, now)),
    deleteTask: (id) => change((r, now) => A.deleteTask(r, id, now)),
  };

  const view = wide && nav.view === 'goals' ? 'today' : nav.view;
  const screen =
    view === 'goal' && idx.goalById.has(nav.goalId) ? (
      <GoalDetail key={nav.goalId} api={api} goalId={nav.goalId} />
    ) : view === 'goals' ? (
      <Goals api={api} />
    ) : view === 'progress' ? (
      <Progress api={api} />
    ) : (
      <Today api={api} />
    );

  return (
    <div className={`shell ${wide ? 'wide' : 'narrow'}`}>
      {wide && <Nav api={api} />}
      <main className="main">{screen}</main>
      {!wide && <Nav api={api} />}
      {sheet?.kind === 'goal' && <GoalEditor key={sheet.rec.id} goal={sheet.rec} api={api} onClose={api.closeSheet} />}
      {sheet?.kind === 'habit' && <HabitSheet key={sheet.rec.id} habit={sheet.rec} api={api} onClose={api.closeSheet} />}
      {sheet?.kind === 'item' && <ItemSheet key={`${sheet.item.kind}:${sheet.item.id}`} item={sheet.item} api={api} onClose={api.closeSheet} />}
      {sheet?.kind === 'task' && <TaskSheet key={sheet.rec.id} task={sheet.rec} api={api} onClose={api.closeSheet} />}
    </div>
  );
}
