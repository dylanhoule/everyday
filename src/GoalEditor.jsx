import { useState } from 'react';
import Sheet, { Field, setOpt, num } from './Sheet.jsx';
import HabitFields, { habitValid, cleanHabit } from './HabitFields.jsx';
import { blankHabit, changedOnly, nextPhase } from './records.js';

const COLORS = ['orange', 'blue', 'cyan', 'purple', 'green', 'pink'];

// Habits still running (not ended before today) belong in the editor.
export const liveHabits = (idx, goalId, today) =>
  idx.habits.filter((h) => h.goalId === goalId && (!h.endDate || h.endDate >= today));

function phaseValid(p) {
  return p.name.trim() !== '' && p.start && p.end && p.start <= p.end;
}

export default function GoalEditor({ goal, api, onClose }) {
  const { idx, today } = api;
  const isNew = !idx.goalById.has(goal.id);
  const [g, setG] = useState(goal);
  const [m, setM] = useState({ unit: goal.measure?.unit ?? '', target: goal.measure?.target ?? '', per: goal.measure?.per ?? 'week' });
  const [stat, setStat] = useState({ value: goal.stat?.value ?? '', label: goal.stat?.label ?? '' });
  const [initialHabits] = useState(() => liveHabits(idx, goal.id, today));
  const [habits, setHabits] = useState(initialHabits);
  const [removed, setRemoved] = useState([]);

  const set = (k, v) => setG((x) => setOpt(x, k, v));
  const setPhase = (i, k, v) => setG((x) => ({ ...x, path: x.path.map((p, j) => (j === i ? setOpt(p, k, v) : p)) }));
  const movePhase = (i, d) =>
    setG((x) => {
      const path = [...x.path];
      [path[i], path[i + d]] = [path[i + d], path[i]];
      return { ...x, path };
    });
  const addPhase = () => setG((x) => ({ ...x, path: [...x.path, nextPhase(x.path, today)] }));

  const hasMeasure = String(m.unit).trim() !== '' || m.target !== '';
  const measureOk = !hasMeasure || (String(m.unit).trim() !== '' && Number(m.target) > 0);
  const datesOk = !g.endDate || (g.date && g.endDate >= g.date);
  const valid =
    g.name.trim() !== '' && measureOk && datesOk && g.path.every(phaseValid) && habits.every(habitValid);

  const save = () => {
    let out = { ...g, name: g.name.trim(), title: g.title.trim() || g.name.trim() };
    out = setOpt(out, 'note', g.note?.trim());
    out = setOpt(out, 'measure', hasMeasure ? { unit: m.unit.trim(), target: Number(m.target), per: m.per } : null);
    out = setOpt(out, 'stat', stat.value.trim() ? { value: stat.value.trim(), label: stat.label.trim() } : null);
    out.path = g.path.map((p) => setOpt(setOpt({ ...p, name: p.name.trim() }, 'note', p.note?.trim()), 'target', p.target));
    api.save([out, ...changedOnly(initialHabits, habits.map(cleanHabit))]);
    removed.forEach((id) => api.removeHabit(id));
    onClose();
    if (isNew) api.open({ view: 'goal', goalId: out.id });
  };

  return (
    <Sheet
      title={isNew ? 'New goal' : 'Edit goal'}
      onClose={onClose}
      footer={
        <button type="button" className="btn primary" disabled={!valid} onClick={save}>
          {isNew ? 'Create goal' : 'Save'}
        </button>
      }
    >
      <section className="form-section">
        <div className="fields">
          <Field label="Short name" wide>
            <input value={g.name} placeholder="Half marathon" onChange={(e) => setG({ ...g, name: e.target.value })} />
          </Field>
          <Field label="The goal" wide>
            <input value={g.title} placeholder={g.name || 'Half marathon in under 2:00'} onChange={(e) => setG({ ...g, title: e.target.value })} />
          </Field>
          <div className="field field-wide">
            <span className="field-label">Color</span>
            <div className="swatches" role="radiogroup" aria-label="Color">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={g.color === c}
                  aria-label={c}
                  data-color={c}
                  className={`swatch ${g.color === c ? 'on' : ''}`}
                  onClick={() => setG({ ...g, color: c })}
                />
              ))}
            </div>
          </div>
          <Field label="Date (optional)">
            <input type="date" value={g.date ?? ''} onChange={(e) => setG((x) => setOpt(e.target.value ? x : setOpt(x, 'endDate', null), 'date', e.target.value))} />
          </Field>
          <Field label="Ends (for a range)">
            <input type="date" value={g.endDate ?? ''} disabled={!g.date} min={g.date} onChange={(e) => set('endDate', e.target.value)} />
          </Field>
          <Field label="Note" wide>
            <textarea rows={2} value={g.note ?? ''} placeholder="Push, pull, legs, plus one upper day." onChange={(e) => set('note', e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="form-section">
        <h3>Measure</h3>
        <p className="hint">What adds up toward this goal, like miles per week or review sessions in total.</p>
        <div className="fields">
          <Field label="Unit">
            <input value={m.unit} placeholder="mi" onChange={(e) => setM({ ...m, unit: e.target.value })} />
          </Field>
          <Field label="Target">
            <input type="number" min="0" step="any" inputMode="decimal" value={m.target} placeholder="15" onChange={(e) => setM({ ...m, target: num(e.target.value) })} />
          </Field>
          <Field label="Per">
            <select value={m.per} onChange={(e) => setM({ ...m, per: e.target.value })}>
              <option value="week">week</option>
              <option value="total">total</option>
            </select>
          </Field>
          <Field label="Extra stat (optional)">
            <div className="pair">
              <input value={stat.value} placeholder="9:09" aria-label="Stat value" onChange={(e) => setStat({ ...stat, value: e.target.value })} />
              <input value={stat.label} placeholder="goal pace / mi" aria-label="Stat label" onChange={(e) => setStat({ ...stat, label: e.target.value })} />
            </div>
          </Field>
        </div>
        {!measureOk && <p className="error">A measure needs both a unit and a target above 0.</p>}
      </section>

      <section className="form-section">
        <h3>The path</h3>
        <p className="hint">Phases with dates. A phase target replaces the measure target while it runs.</p>
        {g.path.map((p, i) => (
          <div className="repeat" key={i}>
            <div className="fields">
              <Field label={`Phase ${i + 1}`} wide>
                <input value={p.name} placeholder="Build: 20 mi weeks" onChange={(e) => setPhase(i, 'name', e.target.value)} />
              </Field>
              <Field label="Starts">
                <input type="date" value={p.start} onChange={(e) => setPhase(i, 'start', e.target.value)} />
              </Field>
              <Field label="Ends">
                <input type="date" value={p.end} min={p.start} onChange={(e) => setPhase(i, 'end', e.target.value)} />
              </Field>
              <Field label="Note">
                <input value={p.note ?? ''} placeholder="Long run grows to 8 mi." onChange={(e) => setPhase(i, 'note', e.target.value)} />
              </Field>
              <Field label="Target (optional)">
                <input type="number" min="0" step="any" inputMode="decimal" value={p.target ?? ''} onChange={(e) => setPhase(i, 'target', num(e.target.value))} />
              </Field>
            </div>
            {p.start && p.end && p.start > p.end && <p className="error">The phase ends before it starts.</p>}
            <div className="row-actions">
              <button type="button" className="link" disabled={i === 0} onClick={() => movePhase(i, -1)}>Move up</button>
              <button type="button" className="link" disabled={i === g.path.length - 1} onClick={() => movePhase(i, 1)}>Move down</button>
              <button type="button" className="link danger" onClick={() => setG({ ...g, path: g.path.filter((_, j) => j !== i) })}>Remove</button>
            </div>
          </div>
        ))}
        <button type="button" className="btn" onClick={addPhase}>Add phase</button>
      </section>

      <section className="form-section">
        <h3>What gets you there</h3>
        <p className="hint">Habits fill your Today list on the days you pick.</p>
        {habits.map((h, i) => (
          <div className="repeat" key={h.id}>
            <HabitFields habit={h} onChange={(next) => setHabits(habits.map((x, j) => (j === i ? next : x)))} />
            <div className="row-actions">
              <button
                type="button"
                className="link danger"
                onClick={() => {
                  if (idx.habits.some((x) => x.id === h.id)) setRemoved([...removed, h.id]);
                  setHabits(habits.filter((_, j) => j !== i));
                }}
              >
                Remove habit
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="btn"
          onClick={() => setHabits([...habits, blankHabit(hasMeasure ? { ...g, measure: { unit: m.unit.trim() } } : g, today)])}
        >
          Add habit
        </button>
      </section>
    </Sheet>
  );
}

export function HabitSheet({ habit, api, onClose }) {
  const [h, setH] = useState(habit);
  const exists = api.idx.habits.some((x) => x.id === habit.id);
  return (
    <Sheet
      title={exists ? 'Edit habit' : 'New habit'}
      onClose={onClose}
      footer={
        <>
          {exists && (
            <button type="button" className="btn danger" onClick={() => (api.removeHabit(h.id), onClose())}>
              Remove
            </button>
          )}
          <button type="button" className="btn primary" disabled={!habitValid(h)} onClick={() => (api.save([cleanHabit(h)]), onClose())}>
            Save
          </button>
        </>
      }
    >
      <HabitFields habit={h} onChange={setH} />
    </Sheet>
  );
}
