export default function GoalDetail({ api, goalId }) {
  const goal = api.idx.goalById.get(goalId);
  return (
    <div className="page">
      <h1 className="page-title">{goal.title}</h1>
    </div>
  );
}
