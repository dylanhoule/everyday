import { useState } from 'react';
import Sheet from './Sheet.jsx';
import { itemsOn, isLocked } from './score.js';
import { logId } from './records.js';
import { fmtDate, fmtTime } from './words.js';

export default function ItemSheet({ item, api, onClose }) {
  const { idx, today } = api;
  // Re-derive from the live index so toggles and amount edits show up here.
  const live = itemsOn(idx, item.date).find((i) => i.kind === item.kind && i.id === item.id) ?? item;
  const amountId = live.kind === 'habit' ? logId(live.id, live.date) : live.id;
  const locked = live.kind === 'habit' ? isLocked(live.date, today) : isLocked(live.rec.doneDate ?? today, today);
  const [draft, setDraft] = useState(String(live.amount));
  const edit = () => api.openSheet({ kind: live.kind, rec: live.rec });

  return (
    <Sheet
      title={live.title}
      onClose={onClose}
      footer={
        <>
          {live.kind === 'task' && (
            <button type="button" className="btn danger" onClick={() => (api.deleteTask(live.id), onClose())}>
              Delete
            </button>
          )}
          <button type="button" className="btn" onClick={edit}>
            Edit
          </button>
          <button type="button" className="btn primary" onClick={() => api.toggleItem(live)} disabled={live.kind === 'habit' && isLocked(live.date, today)}>
            {live.done ? 'Mark not done' : 'Mark done'}
          </button>
        </>
      }
    >
      <div className="item-detail" data-color={live.goal?.color}>
        <p className="item-goal">
          <span className="dot" />
          {live.goal?.name ?? 'Other'}
        </p>
        {live.note && <p>{live.note}</p>}
        <p className="muted">
          {live.date === today ? 'Today' : fmtDate(live.date)} · {fmtTime(live.time)}
        </p>
        {live.done && (
          <label className="field">
            <span className="field-label">Logged{live.unit ? ` (${live.unit})` : ''}</span>
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={draft}
              disabled={locked}
              onChange={(e) => {
                setDraft(e.target.value);
                if (e.target.value !== '' && Number(e.target.value) >= 0) api.setAmount(amountId, Number(e.target.value));
              }}
            />
          </label>
        )}
      </div>
    </Sheet>
  );
}
