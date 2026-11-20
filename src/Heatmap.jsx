import { addDays, weekStart } from './date.js';
import { dayCell } from './score.js';
import { fmtDate } from './words.js';

const WEEKS = 26;
const level = (s) => (s === 0 ? 0 : s < 50 ? 1 : s < 70 ? 2 : s < 90 ? 3 : 4);

export default function Heatmap({ api }) {
  const { idx, today } = api;
  const first = addDays(weekStart(today), -7 * (WEEKS - 1));
  let scored = 0;
  let good = 0;
  const cols = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(first, w * 7 + d);
      const cell = dayCell(idx, date, today);
      if (cell.kind === 'score') {
        scored += 1;
        if (cell.score >= 70) good += 1;
      }
      return { date, ...cell };
    })
  );
  return (
    <section className="heatmap">
      <header className="col-head">
        <h2>Every day, all goals</h2>
        <span className="muted">
          {good} of {scored} days at 70%+ · last {WEEKS} weeks
        </span>
      </header>
      <div className="heat-scroll">
        <div className="heat-grid" role="img" aria-label={`${good} of ${scored} days at 70% or better over the last ${WEEKS} weeks`}>
          {cols.map((col, w) => (
            <div className="heat-col" key={w}>
              {col.map((c) => (
                <span
                  key={c.date}
                  title={c.kind === 'score' ? `${fmtDate(c.date)}: ${c.score}%` : c.kind === 'rest' ? `${fmtDate(c.date)}: rest day` : undefined}
                  className={`heat ${c.kind === 'score' ? `l${level(c.score)}` : c.kind} ${c.date === today ? 'today' : ''}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="heat-legend">
        <span className="muted">Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className={`heat l${l}`} />
        ))}
        <span className="muted">More</span>
        <span className="heat rest" />
        <span className="muted">Rest day</span>
      </div>
    </section>
  );
}
