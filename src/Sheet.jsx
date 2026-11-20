import { useEffect, useRef } from 'react';

// Full-screen panel on phones, centered modal on desktop. Escape or backdrop closes.
export default function Sheet({ title, onClose, footer, children }) {
  const ref = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close.current();
    addEventListener('keydown', onKey);
    ref.current?.querySelector('input, select, textarea')?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <header className="sheet-head">
          <button type="button" className="link" onClick={onClose}>
            Cancel
          </button>
          <h2>{title}</h2>
          <span />
        </header>
        <div className="sheet-body">{children}</div>
        {footer && <footer className="sheet-foot">{footer}</footer>}
      </div>
    </div>
  );
}

export const Field = ({ label, children, wide }) => (
  <label className={`field ${wide ? 'field-wide' : ''}`}>
    <span className="field-label">{label}</span>
    {children}
  </label>
);

// Set an optional key, dropping it when the value is empty (records omit unset fields).
export function setOpt(obj, key, value) {
  const out = { ...obj };
  if (value === '' || value === null || value === undefined) delete out[key];
  else out[key] = value;
  return out;
}

// '' stays '' (field cleared); anything else becomes a number.
export const num = (v) => (v === '' ? '' : Number(v));
