import { dueGroups } from './canvas.js';
import { fmtTime } from './words.js';

// Read-only Canvas deadlines. Separate from goals: no checkboxes, never in score or streak.
export default function DuePanel({ api }) {
  const { canvas, today } = api;
  if (!canvas || canvas.status === 'off') return null;
  const groups = dueGroups(canvas.events, today, Date.now());
  return (
    <section className="due-panel" aria-label="Due soon from Canvas">
      <header className="group-head">
        <span>Due soon</span>
        <span className="muted">Canvas</span>
      </header>
      {groups.length === 0 ? (
        <p className="muted due-empty">Nothing due in the next two weeks.</p>
      ) : (
        groups.map((g) => (
          <div className="due-day" key={g.date}>
            <p className="due-label">{g.label}</p>
            <ul className="items">
              {g.events.map((e) => {
                const body = (
                  <>
                    <span className="item-body">
                      <span className="item-title">{e.title}</span>
                      {e.course && <span className="item-note">{e.course}</span>}
                    </span>
                    <span className="item-time">{fmtTime(e.time)}</span>
                  </>
                );
                return (
                  <li key={`${e.uid}:${g.date}`}>
                    {e.url ? (
                      <a className="due-row" href={e.url} target="_blank" rel="noreferrer">
                        {body}
                      </a>
                    ) : (
                      <div className="due-row">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
