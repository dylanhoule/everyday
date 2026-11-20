import { itemsOn } from './score.js';
import { barFill, dateLabel, goalPct, goalStatus, habitWeek, headline, measureProgress, measureText, summary } from './goals.js';
import { liveHabits } from './GoalEditor.jsx';

const STATUS = { on: 'On track', slipping: 'Slipping', new: 'New' };
export const StatusChip = ({ status }) => (STATUS[status] ? <span className={`status ${status}`}>{STATUS[status]}</span> : null);

export function Segments({ fill, n = 5 }) {
  return (
    <div className="segments" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <span key={i}>
          <span style={{ width: `${Math.max(0, Math.min(1, fill * n - i)) * 100}%` }} />
        </span>
      ))}
    </div>
  );
}

export function HabitRow({ habit, goal, api, onClick }) {
  const w = habitWeek(api.idx, habit, goal, api.today);
  const Tag = onClick ? 'button' : 'div';
  return (
    <li>
      <Tag className="habit-row" onClick={onClick}>
        <span className="hr-title">{habit.title}</span>
        <span className="hr-dots" aria-label={`${w.done} of ${w.due} this week`}>
          {w.dots.map((d, i) => (
            <span key={i} className={`hd ${d}`} />
          ))}
        </span>
        <span className="hr-label">{w.label}</span>
      </Tag>
    </li>
  );
}

export default function GoalCard({ goal, api, wide }) {
  const { idx, today } = api;
  const status = goalStatus(idx, goal, today);
  const h = headline(idx, goal, today);
  const pct = goalPct(idx, goal, today);
  const m = measureProgress(idx, goal, today);
  const todays = itemsOn(idx, today).filter((i) => i.goal?.id === goal.id);
  const habits = liveHabits(idx, goal.id, today);
  const open = () => api.open({ view: 'goal', goalId: goal.id });
  const showPct = wide && status !== 'idle' && !h.value.endsWith('%'); // skip when the headline already is the %

  return (
    <article
      className={`goal-card ${wide ? 'wide' : ''}`}
      data-color={goal.color}
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => e.key === 'Enter' && open()}
    >
      <header className="gc-top">
        <span className="gc-date">
          <span className="dot" />
          {dateLabel(goal, today)}
        </span>
        <StatusChip status={status} />
      </header>
      <h3 className="gc-title">{goal.title}</h3>
      <div className="gc-headline">
        <span className="big">{h.value}</span>
        <span className="gc-label">{h.label}</span>
        {showPct && (
          <span className="gc-pct">
            <span className="vbar small" aria-hidden="true">
              <span style={{ height: `${pct ?? 0}%` }} />
            </span>
            {status === 'new' ? 'New' : `${pct ?? 0}%`}
          </span>
        )}
      </div>
      <Segments fill={barFill(idx, goal, today)} />
      {wide ? (
        <p className="gc-summary">{summary(idx, goal, today)}</p>
      ) : (
        <footer className="gc-foot">
          <span>{m ? measureText(m) : goal.note ?? ''}</span>
          <span className="gc-today">
            Today {todays.filter((i) => i.done).length} of {todays.length}
          </span>
        </footer>
      )}
      {wide && habits.length > 0 && (
        <div className="gc-habits">
          <p className="eyebrow">What gets you there</p>
          <ul>
            {habits.map((x) => (
              <HabitRow key={x.id} habit={x} goal={goal} api={api} />
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
