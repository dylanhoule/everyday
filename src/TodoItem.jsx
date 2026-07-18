import { useRef, useState } from 'react';
import { classifyGesture, shouldDelete } from './swipe.js';

export default function TodoItem({ todo, onToggle, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [dx, setDx] = useState(0); // current swipe offset (<= 0)
  const drag = useRef(null); // { startX, startY, kind }

  const onPointerDown = (e) => {
    if (editing || e.pointerType === 'mouse') return; // swipe = touch/pen only
    drag.current = { startX: e.clientX, startY: e.clientY, kind: 'tap' };
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const mx = e.clientX - d.startX;
    const my = e.clientY - d.startY;
    if (d.kind === 'tap') {
      d.kind = classifyGesture(mx, my);
      // Capture once it's a swipe so pointerup outside the row still ends the drag.
      // Not on pointerdown: capture retargets the eventual click away from buttons.
      if (d.kind === 'swipe') e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (d.kind === 'swipe') setDx(Math.min(0, mx)); // left only
  };

  const endDrag = () => {
    const d = drag.current;
    drag.current = null;
    if (d && d.kind === 'swipe' && shouldDelete(dx)) onDelete(todo.id);
    else setDx(0); // snap back
  };

  const saveEdit = (e) => {
    onEdit(todo.id, e.target.value);
    setEditing(false);
  };

  return (
    <li
      className={`row ${todo.done ? 'done' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className="delete-pane" style={{ opacity: dx < -20 ? 1 : 0 }}>
        Delete
      </div>
      <div className="row-face" style={{ transform: `translateX(${dx}px)` }}>
        <button
          className="check"
          aria-label={todo.done ? 'Mark not done' : 'Mark done'}
          onClick={() => onToggle(todo.id)}
        >
          {todo.done ? '✓' : ''}
        </button>

        {editing ? (
          <input
            className="edit-input"
            defaultValue={todo.text}
            autoFocus
            onBlur={saveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.target.blur();
              if (e.key === 'Escape') {
                e.target.value = todo.text;
                e.target.blur();
              }
            }}
          />
        ) : (
          <span
            className="text"
            role="button"
            tabIndex={0}
            aria-label={`Edit "${todo.text}"`}
            onClick={() => setEditing(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setEditing(true);
              }
            }}
          >
            {todo.text}
          </span>
        )}

        <button className="x" aria-label="Delete" onClick={() => onDelete(todo.id)}>
          ✕
        </button>
      </div>
    </li>
  );
}
