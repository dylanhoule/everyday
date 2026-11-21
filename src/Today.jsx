import { addDays, dayParts, daysBetween } from './date.js';
import { blankGoal, blankTask } from './records.js';
import { earlierItems, itemsOn, streaks, toKeep } from './score.js';
import { activeGoals, coachNote } from './goals.js';
import { cap, fmtDate, fmtTime, numberWord } from './words.js';
import { Icon } from './Nav.jsx';
import GoalCard from './GoalCard.jsx';
import Heatmap from './Heatmap.jsx';
import DuePanel from './DuePanel.jsx';

// One a day, the same on every device: rotates by date, not at random per render.
const QUOTES = [
  ['What you do every day matters more than what you do once in a while.', 'Gretchen Rubin'],
  ['You do not rise to the level of your goals. You fall to the level of your systems.', 'James Clear'],
  ['Every action you take is a vote for the type of person you wish to become.', 'James Clear'],
  ['How we spend our days is, of course, how we spend our lives.', 'Annie Dillard'],
  ['Success is the sum of small efforts, repeated day in and day out.', 'Robert Collier'],
  ['Motivation is what gets you started. Habit is what keeps you going.', 'Jim Ryun'],
  ['We are what we repeatedly do. Excellence, then, is not an act, but a habit.', 'Will Durant'],
  ['Small daily improvements over time lead to stunning results.', 'Robin Sharma'],
  ['A year from now you may wish you had started today.', 'Karen Lamb'],
  ['The successful warrior is the average man, with laser-like focus.', 'Bruce Lee'],
];
const quoteFor = (today) => QUOTES[daysBetween('2026-01-01', today) % QUOTES.length];
const counted = (n, one, many) => `${numberWord(n)} ${n === 1 ? one : many}`;

export function ItemRow({ item, api, showGoal, showNote, label }) {
  return (
    <li className={`item ${item.done ? 'done' : ''}`} data-color={item.goal?.color}>
      <button
        className="check"
        aria-label={item.done ? `Mark "${item.title}" not done` : `Mark "${item.title}" done`}
        aria-pressed={item.done}
        onClick={() => api.toggleItem(item)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 12.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button className="item-body" onClick={() => api.openSheet({ kind: 'item', item })}>
        <span className="item-title">{item.title}</span>
        {showNote && item.note && <span className="item-note">{item.note}</span>}
        {showGoal && (
          <span className="item-goal">
            <span className="dot" />
            {item.goal?.name ?? 'Other'}
          </span>
        )}
      </button>
      <span className="item-time">{label ?? fmtTime(item.time)}</span>
    </li>
  );
}

export function ScoreBlock({ api }) {
  const { idx, today } = api;
  const items = itemsOn(idx, today);
  const done = items.filter((i) => i.done).length;
  const due = items.length;
  const score = due ? Math.round((100 * done) / due) : 0;
  const c = streaks(idx, today).current;
  const k = toKeep(due, done);
  const line = !due
    ? 'Rest day'
    : k > 0
      ? c > 0
        ? `${k} more keeps your ${c}-day streak`
        : `${k} more to start a streak`
      : `Today counts toward your ${c}-day streak`;
  return (
    <div className="score">
      <span className="vbar" aria-hidden="true">
        <span style={{ height: `${score}%` }} />
      </span>
      <span className="score-num" aria-label={`Day score ${score} percent`}>
        {score}
      </span>
      <div className="score-text">
        <p>
          {done} of {due} done
        </p>
        <p className="muted">{line}</p>
      </div>
    </div>
  );
}

export default function Today({ api }) {
  const { idx, today, wide } = api;
  const goals = activeGoals(idx);
  const items = itemsOn(idx, today);
  const earlier = earlierItems(idx, today);
  const note = coachNote(idx, today);
  const quote = quoteFor(today);
  const yesterday = addDays(today, -1);
  const date = dayParts(today).toLocaleDateString('en-US', { weekday: 'long', month: wide ? 'long' : 'short', day: 'numeric' });
  const moves = items.length;
  const headline = !moves
    ? 'Nothing due today.'
    : wide
      ? `${cap(counted(goals.length, 'goal', 'goals'))}, ${counted(moves, 'move', 'moves')} today.`
      : `${cap(counted(moves, 'move', 'moves'))} today.`;
  const addTask = () => api.openSheet({ kind: 'task', rec: blankTask(today) });
  const isActive = (i) => i.goal && !i.goal.archivedOn;

  const left = earlier.filter((i) => !i.done).length;
  // Native <details>: open while something is left, collapsible once it's all checked.
  const earlierGroup = earlier.length > 0 && (
    <details className="group earlier" open={left > 0}>
      <summary className="group-head">
        <span>Earlier</span>
        <span className="muted">{left ? `${left} left` : 'All done'}</span>
      </summary>
      <ul className="items">
        {earlier.map((i) => (
          <ItemRow key={`${i.kind}:${i.id}:${i.date}`} item={i} api={api} showGoal label={i.date === yesterday ? 'Yesterday' : fmtDate(i.date)} />
        ))}
      </ul>
    </details>
  );

  const groups = [
    ...goals.map((g) => ({ key: g.id, goal: g, items: items.filter((i) => i.goal?.id === g.id) })),
    { key: 'other', goal: null, items: items.filter((i) => !isActive(i)) },
  ].filter((g) => g.items.length);

  const list = wide ? (
    <ul className="items">
      {[...items.filter((i) => i.done), ...items.filter((i) => !i.done)].map((i) => (
        <ItemRow key={`${i.kind}:${i.id}`} item={i} api={api} showGoal />
      ))}
    </ul>
  ) : (
    groups.map((g) => (
      <section className="group" key={g.key} data-color={g.goal?.color}>
        <header className="group-head">
          <span className="group-name">
            <span className="dot" />
            {g.goal?.name ?? 'Other'}
          </span>
          <span className="muted">
            {g.items.filter((i) => i.done).length} of {g.items.length}
          </span>
        </header>
        <ul className="items">
          {g.items.map((i) => (
            <ItemRow key={`${i.kind}:${i.id}`} item={i} api={api} showNote />
          ))}
        </ul>
      </section>
    ))
  );

  const empty = goals.length === 0 && (
    <div className="empty">
      <p className="empty-title">Start with a goal.</p>
      <p className="muted">Each goal writes part of your day.</p>
      <button className="btn primary" onClick={() => api.openSheet({ kind: 'goal', rec: blankGoal(today) })}>
        {Icon.plus} New goal
      </button>
    </div>
  );

  const coach = note && (
    <div className="coach">
      {Icon.coach}
      <p>{note}</p>
    </div>
  );

  const addButton = (
    <button className="icon-btn" aria-label="Add a task" onClick={addTask}>
      {Icon.plus}
    </button>
  );

  if (!wide)
    return (
      <div className="page today">
        <header className="today-head">
          <div className="today-top">
            <p className="date-line">{date}</p>
            {addButton}
          </div>
          <h1 className="headline">{headline}</h1>
          <ScoreBlock api={api} />
        </header>
        {empty}
        {earlierGroup}
        {list}
        {coach}
        <DuePanel api={api} />
      </div>
    );

  return (
    <div className="page today">
      <header className="today-head">
        <p className="date-line">{date}</p>
        <h1 className="headline">{headline}</h1>
        <p className="quote">
          <em>“{quote[0]}”</em> {quote[1]}
        </p>
      </header>
      <div className="today-grid">
        <div className="today-goals">
          {goals.length ? (
            <>
              <header className="col-head">
                <h2>Goals</h2>
                <span className="muted">% = how often you did the daily work, last 14 days</span>
              </header>
              <div className="goal-grid">
                {goals.map((g) => (
                  <GoalCard key={g.id} goal={g} api={api} wide />
                ))}
              </div>
            </>
          ) : (
            empty
          )}
        </div>
        <section className="today-col">
          <header className="col-head">
            <h2>Today</h2>
            <span className="muted">{streaks(idx, today).current}-day streak</span>
            {addButton}
          </header>
          <ScoreBlock api={api} />
          {earlierGroup}
          {list}
          <DuePanel api={api} />
          {coach}
        </section>
      </div>
      <Heatmap api={api} />
    </div>
  );
}
