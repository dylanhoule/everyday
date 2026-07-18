import { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { classifyGesture, shouldDelete } from './swipe.js';

const CHECK_MS = 450; // check-off choreography length before the row leaves the list

export default function TodoItem({ todo, leaveOnComplete = false, onToggle, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [checking, setChecking] = useState(false); // choreography in flight, toggle deferred
  const [dx, setDx] = useState(0); // current swipe offset (<= 0)
  const [dragging, setDragging] = useState(false);
  const drag = useRef(null); // { startX, startY, kind }
  const reduced = useReducedMotion();

  const check = () => {
    if (checking) return; // ignore re-taps mid-choreography
    if (todo.done || !leaveOnComplete || reduced) return onToggle(todo.id);
    setChecking(true);
    // Deliberately not cleared on unmount: the toggle must still commit if the
    // view switches mid-choreography. A stale id is a no-op in App's toggle.
    setTimeout(() => onToggle(todo.id), CHECK_MS);
  };

  const onPointerDown = (e) => {
    if (editing || e.pointerType === 'mouse') return; // swipe = touch/pen only
    drag.current = { startX: e.clientX, startY: e.clientY, kind: 'tap' };
    setDragging(true);
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
    setDragging(false);
    if (d && d.kind === 'swipe' && shouldDelete(dx)) onDelete(todo.id);
    else setDx(0); // spring back (CSS transition on .row-face)
  };

  const saveEdit = (e) => {
    onEdit(todo.id, e.target.value);
    setEditing(false);
  };

  const done = todo.done || checking;

  return (
    <motion.li
      initial={{ opacity: 0, y: -8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.16, ease: 'easeIn' } }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className={`row ${done ? 'done' : ''} ${checking ? 'checking' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className="delete-pane" style={{ opacity: dx < -20 ? 1 : 0 }}>
        Delete
      </div>
      <div
        className={`row-face ${dragging ? 'dragging' : ''}`}
        style={{ transform: `translateX(${dx}px)` }}
      >
        <button
          className="check"
          aria-label={todo.done ? 'Mark not done' : 'Mark done'}
          onClick={check}
        >
          <svg className="tick" viewBox="0 0 24 24" aria-hidden="true">
            <path
              className="tickpath"
              d="M5 13l4 4L19 7"
              pathLength="1"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
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
            <span className="text-inner">{todo.text}</span>
          </span>
        )}

        <button className="x" aria-label="Delete" onClick={() => onDelete(todo.id)}>
          ✕
        </button>
      </div>
    </motion.li>
  );
}
