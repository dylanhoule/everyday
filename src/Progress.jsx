import { useState } from 'react';
import { addDays, dayParts } from './date.js';
import { dayCell, rangeAverage, streaks } from './score.js';
import { activeGoals, goalPct, goalReason, goalStatus } from './goals.js';
import { rangeLabel } from './words.js';
import Heatmap from './Heatmap.jsx';

const RANGES = [7, 30, 90];

export default function Progress({ api }) {
  const { idx, today } = api;
  const [n, setN] = useState(7);
  const { avg, prev } = rangeAverage(idx, today, n);
  const { current, best } = streaks(idx, today);
  const delta = avg !== null && prev !== null ? avg - prev : null;
  const days = Array.from({ length: n }, (_, i) => addDays(today, i - n + 1))
    .map((date) => ({ date, ...dayCell(idx, date, today) }))
    .filter((c) => c.kind !== 'none');

  return (
    <div className="page progress">
      <header className="progress-head">
        <h1 className="page-title">Progress</h1>
        <div className="seg" role="group" aria-label="Range">
          {RANGES.map((r) => (
            <button key={r} className={n === r ? 'on' : ''} aria-pressed={n === r} onClick={() => setN(r)}>
              {r}D
            </button>
          ))}
        </div>
      </header>

      <p className="muted">Average day score, last {n} days</p>
      <div className="avg-row">
        <span className="score">
          <span className="vbar" aria-hidden="true">
            <span style={{ height: `${avg ?? 0}%` }} />
          </span>
          <span className="score-num">
            {avg ?? '-'}
            {avg !== null && <span className="pct">%</span>}
          </span>
        </span>
        {delta !== null && (
          <span className={delta >= 0 ? 'up' : 'muted'}>
            {delta >= 0 ? '+' : ''}
            {delta} vs {n === 7 ? 'week before' : `previous ${n} days`}
          </span>
        )}
      </div>

      <div className={`bars ${n > 7 ? 'thin' : ''}`} role="img" aria-label={`Day scores, last ${n} days`}>
        <span className="bar-line" aria-hidden="true" />
        {days.map((c) => (
          <span
            key={c.date}
            className={`bar ${c.kind} ${c.date === today ? 'today' : ''}`}
            style={c.kind === 'score' ? { height: `${Math.max(c.score, 2)}%` } : undefined}
            title={c.kind === 'score' ? `${c.score}%` : 'Rest day'}
          />
        ))}
      </div>
      {n === 7 && (
        <div className="bar-days" aria-hidden="true">
          {days.map((c) => (
            <span key={c.date}>{dayParts(c.date).toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
          ))}
        </div>
      )}
      <p className="muted caption">Dashed line is 70%, the bar for a day to count toward your streak.</p>

      <div className="stats streak-stats">
        <div className="stat">
          <span className="stat-label">Current streak</span>
          <span className="big">
            {current} <small>days</small>
          </span>
          <span className="stat-label">{best && best.len > current ? `${best.len - current} to beat your best` : 'Your best yet'}</span>
        </div>
        {best && (
          <div className="stat">
            <span className="stat-label">Best streak</span>
            <span className="big">
              {best.len} <small>days</small>
            </span>
            <span className="stat-label">{rangeLabel(best.start, best.end)}</span>
          </div>
        )}
      </div>

      <section className="detail-section">
        <header className="col-head">
          <h2>By goal</h2>
          <span className="muted">daily work done, 14 days</span>
        </header>
        <ul className="by-goal">
          {activeGoals(idx).map((g) => {
            const status = goalStatus(idx, g, today);
            const pct = goalPct(idx, g, today);
            return (
              <li key={g.id} data-color={g.color}>
                <button onClick={() => api.open({ view: 'goal', goalId: g.id })}>
                  <span className="dot" />
                  <span className="bg-text">
                    <span className="bg-name">{g.name}</span>
                    <span className="muted">{goalReason(idx, g, today)}</span>
                  </span>
                  {status === 'new' ? (
                    <span className="bg-new">New</span>
                  ) : (
                    <span className="bg-pct">
                      <span className="vbar small" aria-hidden="true">
                        <span style={{ height: `${pct ?? 0}%` }} />
                      </span>
                      {pct ?? 0}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <Heatmap api={api} />
    </div>
  );
}
