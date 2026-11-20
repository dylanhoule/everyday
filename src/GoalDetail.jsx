import { useState } from 'react';
import { blankHabit, blankTask } from './records.js';
import { currentPhase, goalPct, goalStatus, headline, measureProgress, measureText } from './goals.js';
import { fmtDate, fmtTime, rangeLabel } from './words.js';
import { liveHabits } from './GoalEditor.jsx';
import { HabitRow, StatusChip } from './GoalCard.jsx';
import { Icon } from './Nav.jsx';

export default function GoalDetail({ api, goalId }) {
  const { idx, today, wide } = api;
  const goal = idx.goalById.get(goalId);
  const [menu, setMenu] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const status = goalStatus(idx, goal, today);
  const h = headline(idx, goal, today);
  const pct = goalPct(idx, goal, today);
  const m = measureProgress(idx, goal, today);
  const cur = currentPhase(goal, today);
  const habits = liveHabits(idx, goal.id, today);
  const tasks = idx.tasks
    .filter((t) => t.goalId === goal.id && !t.done && t.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '~').localeCompare(b.time ?? '~'));
  const back = () => api.open({ view: wide ? 'today' : 'goals' });
  const archive = () => {
    if (!confirming) return setConfirming(true);
    api.archiveGoal(goal.id);
    back();
  };

  return (
    <div className="page detail" data-color={goal.color}>
      <nav className="detail-nav">
        <button className="link back" onClick={back}>
          {Icon.back}
          {wide ? 'Today' : 'Goals'}
        </button>
        <div className="menu-wrap">
          <button className="icon-btn ghost" aria-label="Goal actions" aria-expanded={menu} onClick={() => (setMenu(!menu), setConfirming(false))}>
            {Icon.more}
          </button>
          {menu && (
            <div className="menu" role="menu">
              <button role="menuitem" onClick={() => (setMenu(false), api.openSheet({ kind: 'goal', rec: goal }))}>
                Edit goal
              </button>
              <button role="menuitem" className="danger" onClick={archive}>
                {confirming ? 'Tap again to archive' : 'Archive'}
              </button>
            </div>
          )}
        </div>
      </nav>

      <p className="gd-name">
        <span className="dot" />
        {goal.name}
      </p>
      <h1 className="gd-title">{goal.title}</h1>
      <StatusChip status={status} />
      {goal.note && <p className="gd-note">{goal.note}</p>}

      <div className="stats">
        <div className="stat">
          <span className="big">{h.value}</span>
          <span className="stat-label">{h.label}</span>
        </div>
        {!h.value.endsWith('%') && (
          <div className="stat">
            <span className="big with-bar">
              <span className="vbar small" aria-hidden="true">
                <span style={{ height: `${pct ?? 0}%` }} />
              </span>
              {pct ?? 0}
            </span>
            <span className="stat-label">% daily work done</span>
          </div>
        )}
        {goal.stat && (
          <div className="stat">
            <span className="big">{goal.stat.value}</span>
            <span className="stat-label">{goal.stat.label}</span>
          </div>
        )}
      </div>

      {goal.path.length > 0 && (
        <section className="detail-section">
          <h2>The path</h2>
          <ol className="path">
            {goal.path.map((p, i) => {
              const now = cur?.index === i;
              const note = now ? ['Now.', m && `${measureText(m)}.`, p.note].filter(Boolean).join(' ') : p.note;
              return (
                <li key={i} className={now ? 'now' : p.end < today ? 'past' : ''}>
                  <span className="marker" aria-hidden="true" />
                  <div className="ph-body">
                    <p className="ph-name">{p.name}</p>
                    {note && <p className="ph-note">{note}</p>}
                  </div>
                  <span className="ph-date">{p.start === p.end ? fmtDate(p.start) : rangeLabel(p.start, p.end)}</span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section className="detail-section">
        <h2>What gets you there</h2>
        <ul className="habit-list">
          {habits.map((x) => (
            <HabitRow key={x.id} habit={x} goal={goal} api={api} onClick={() => api.openSheet({ kind: 'habit', rec: x })} />
          ))}
        </ul>
        {tasks.length > 0 && (
          <ul className="task-list">
            {tasks.map((t) => (
              <li key={t.id}>
                <button className="task-row" onClick={() => api.openSheet({ kind: 'task', rec: t })}>
                  <span>{t.title}</span>
                  <span className="muted">
                    {t.date === today ? 'Today' : fmtDate(t.date)} · {fmtTime(t.time)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="detail-actions">
          <button className="btn" onClick={() => api.openSheet({ kind: 'habit', rec: blankHabit(goal, today) })}>
            {Icon.plus} Add habit
          </button>
          <button className="btn" onClick={() => api.openSheet({ kind: 'task', rec: blankTask(today, goal.id) })}>
            {Icon.plus} Add task
          </button>
        </div>
      </section>
    </div>
  );
}
