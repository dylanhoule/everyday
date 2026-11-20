import { blankGoal } from './records.js';
import { activeGoals, sideBadge } from './goals.js';

const OWNER = 'Dylan';

const svg = (d) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);
export const Icon = {
  today: svg(<><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M8.5 12.2l2.4 2.4 4.6-5" /></>),
  goals: svg(<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></>),
  progress: svg(<><path d="M6 19v-6M12 19V6M18 19v-9" /></>),
  coach: svg(<><path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6a2.5 2.5 0 0 1-2.5 2.5H11l-4 3.5V15h0a2 2 0 0 1-2-2z" /></>),
  plus: svg(<><path d="M12 6v12M6 12h12" /></>),
  back: svg(<><path d="M14.5 6l-6 6 6 6" /></>),
  more: svg(<><circle cx="6" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="18" cy="12" r="1" fill="currentColor" /></>),
};

export default function Nav({ api }) {
  const { nav, open, wide, idx, today } = api;
  const item = (view, label) => {
    const on = nav.view === view || (view === 'goals' && nav.view === 'goal');
    return (
    <button className={`nav-item ${on ? 'on' : ''}`} aria-current={on ? 'page' : undefined} onClick={() => open({ view })}>
      {Icon[view]}
      <span>{label}</span>
    </button>
    );
  };

  if (!wide)
    return (
      <nav className="tabbar" aria-label="Main">
        {item('today', 'Today')}
        {item('goals', 'Goals')}
        {item('progress', 'Progress')}
      </nav>
    );

  return (
    <aside className="sidebar">
      <p className="wordmark">everyday</p>
      <nav className="side-nav" aria-label="Main">
        {item('today', 'Today')}
        {item('progress', 'Progress')}
      </nav>
      <p className="side-head">Goals</p>
      <ul className="side-goals">
        {activeGoals(idx).map((g) => (
          <li key={g.id}>
            <button
              className={`side-goal ${nav.view === 'goal' && nav.goalId === g.id ? 'on' : ''}`}
              data-color={g.color}
              onClick={() => open({ view: 'goal', goalId: g.id })}
            >
              <span className="dot" />
              <span className="side-goal-name">{g.name}</span>
              <span className="side-badge">{sideBadge(idx, g, today)}</span>
            </button>
          </li>
        ))}
      </ul>
      <button className="side-new" onClick={() => api.openSheet({ kind: 'goal', rec: blankGoal(today) })}>
        {Icon.plus}
        New goal
      </button>
      <div className="side-foot">
        <span className="avatar">{OWNER[0]}</span>
        {OWNER}
      </div>
    </aside>
  );
}
