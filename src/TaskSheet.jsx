import { useState } from 'react';
import Sheet, { Field, setOpt, num } from './Sheet.jsx';
import { activeGoals } from './goals.js';

export default function TaskSheet({ task, api, onClose }) {
  const [t, setT] = useState(task);
  const exists = api.idx.tasks.some((x) => x.id === task.id);
  const set = (k, v) => setT((x) => setOpt(x, k, v));
  const valid = t.title.trim() !== '' && !!t.date;
  const save = () => {
    const out = ['note', 'unit'].reduce((x, k) => setOpt(x, k, x[k]?.trim()), { ...t, title: t.title.trim() });
    api.save([out]);
    onClose();
  };
  return (
    <Sheet
      title={exists ? 'Edit task' : 'New task'}
      onClose={onClose}
      footer={
        <>
          {exists && (
            <button type="button" className="btn danger" onClick={() => (api.deleteTask(t.id), onClose())}>
              Delete
            </button>
          )}
          <button type="button" className="btn primary" disabled={!valid} onClick={save}>
            Save
          </button>
        </>
      }
    >
      <div className="fields">
        <Field label="Task" wide>
          <input value={t.title} placeholder="MATH 1554 · Lay 6.2" onChange={(e) => setT({ ...t, title: e.target.value })} />
        </Field>
        <Field label="Goal" wide>
          <select value={t.goalId ?? ''} onChange={(e) => set('goalId', e.target.value)}>
            <option value="">Other</option>
            {activeGoals(api.idx).map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input type="date" value={t.date} onChange={(e) => setT({ ...t, date: e.target.value })} />
        </Field>
        <Field label="Time (empty = all day)">
          <input type="time" value={t.time ?? ''} onChange={(e) => set('time', e.target.value)} />
        </Field>
        <Field label="Note" wide>
          <input value={t.note ?? ''} placeholder="Odd problems 1 to 17" onChange={(e) => set('note', e.target.value)} />
        </Field>
        <Field label="Amount (optional)">
          <div className="pair">
            <input type="number" min="0" step="any" inputMode="decimal" value={t.amount ?? ''} placeholder="1" onChange={(e) => set('amount', num(e.target.value))} />
            <input value={t.unit ?? ''} placeholder="unit" aria-label="Unit" onChange={(e) => set('unit', e.target.value)} />
          </div>
        </Field>
      </div>
    </Sheet>
  );
}
