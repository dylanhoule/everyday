import { blankGoal } from './records.js';
import { activeGoals } from './goals.js';
import GoalCard from './GoalCard.jsx';
import { Icon } from './Nav.jsx';

export default function Goals({ api }) {
  const goals = activeGoals(api.idx);
  return (
    <div className="page">
      <header className="goals-head">
        <div>
          <h1 className="page-title">Goals</h1>
          <p className="muted">{goals.length} active. Each one writes part of your day.</p>
        </div>
        <button className="btn primary" onClick={() => api.openSheet({ kind: 'goal', rec: blankGoal(api.today) })}>
          {Icon.plus} New
        </button>
      </header>
      <div className="goal-list">
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} api={api} />
        ))}
      </div>
    </div>
  );
}
