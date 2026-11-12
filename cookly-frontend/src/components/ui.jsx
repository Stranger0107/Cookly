/**
 * Small reusable UI building blocks (buttons, fields, badges, ...).
 * Bigger components (RecipeCard, ChipInput, Layout) live in their own files.
 */
import { useState } from 'react';
import { Star, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { matchTier } from '../utils/ingredients';

export function Button({ variant = 'primary', size, block, loading, children, className = '', ...props }) {
  const classes = ['btn', `btn--${variant}`, size && `btn--${size}`, block && 'btn--block', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button className={classes} disabled={loading || props.disabled} {...props}>
      {loading && <span className="spinner" aria-hidden />}
      {children}
    </button>
  );
}

export function Field({ label, error, hint, htmlFor, children }) {
  return (
    <div className="field">
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {error ? (
        <span className="error" role="alert">
          {error}
        </span>
      ) : (
        hint && <span className="hint">{hint}</span>
      )}
    </div>
  );
}

export function TextInput({ error, className = '', ...props }) {
  return <input className={`input ${error ? 'input--error' : ''} ${className}`} aria-invalid={!!error} {...props} />;
}

export function PasswordInput({ error, ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        className={`input ${error ? 'input--error' : ''}`}
        style={{ paddingRight: 48 }}
        type={visible ? 'text' : 'password'}
        aria-invalid={!!error}
        {...props}
      />
      <button
        type="button"
        className="icon-btn icon-btn--sm"
        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export function Switch({ checked, onChange, label }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" aria-hidden />
      {label}
    </label>
  );
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented glass" role="group" aria-label={label}>
      {options.map((opt) => (
        <button key={opt.value} type="button" aria-pressed={value === opt.value} onClick={() => onChange(opt.value)}>
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const SOURCE_LABEL = { user: 'Your recipe', saved: 'Saved', mealdb: 'TheMealDB' };

export function SourceBadge({ source }) {
  return <span className={`badge badge--${source}`}>{SOURCE_LABEL[source] || source}</span>;
}

export function TierBadge({ percent }) {
  const tier = matchTier(percent);
  return <span className={`badge badge--${tier.key}`}>{tier.label}</span>;
}

/** Circular progress ring for a match percentage. */
export function MatchRing({ percent, size = 64, stroke = 7, sub }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const tier = matchTier(percent);
  return (
    <div
      className={`ring ring--${tier.key}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${percent}% match, ${tier.label}`}
    >
      <svg width={size} height={size}>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
        <circle
          className="ring-value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
        />
      </svg>
      <div className="ring-label">
        <span className="num" style={{ fontSize: size * 0.28 }}>
          {percent}%
        </span>
        {sub && <span className="caption">{sub}</span>}
      </div>
    </div>
  );
}

export function Stars({ value, onChange, size = 20 }) {
  if (!onChange) {
    if (!value) return null;
    return (
      <span className="stars stars--readonly" aria-label={`Rated ${value} out of 5`}>
        {Array.from({ length: value }, (_, i) => (
          <Star key={i} size={size} fill="currentColor" strokeWidth={0} />
        ))}
      </span>
    );
  }
  return (
    <span className="stars" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={value >= n ? 'on' : ''}
          onClick={() => onChange(value === n ? null : n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          aria-checked={value === n}
          role="radio"
        >
          <Star size={size} fill="currentColor" strokeWidth={0} />
        </button>
      ))}
    </span>
  );
}

export function Skeleton({ height = 16, width = '100%', radius, style }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius, ...style }} aria-hidden />;
}

export function EmptyState({ emoji = '🍳', title, children, action }) {
  return (
    <div className="empty">
      <div className="empty__art" aria-hidden>
        {emoji}
      </div>
      <h3>{title}</h3>
      {children && <p className="muted">{children}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

export function Banner({ type = 'warning', icon, children }) {
  return (
    <div className={`banner banner--${type}`} role="status">
      {icon}
      <span>{children}</span>
    </div>
  );
}

export function Pagination({ pagination, onPage }) {
  const { page, limit, total, totalPages } = pagination;
  if (totalPages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  // Show at most 5 page numbers around the current page.
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);

  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="muted small">
        Showing {from}–{to} of {total}
      </span>
      <div className="pagination__pages">
        <button disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft size={18} style={{ margin: 'auto' }} />
        </button>
        {pages.map((p) => (
          <button key={p} aria-current={p === page ? 'page' : undefined} onClick={() => onPage(p)}>
            {p}
          </button>
        ))}
        <button disabled={page === totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight size={18} style={{ margin: 'auto' }} />
        </button>
      </div>
    </nav>
  );
}

/** <img> that falls back to a friendly emoji tile if the URL is missing or broken. */
export function Img({ src, alt, emoji = '🍲', ...props }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="img-fallback" role="img" aria-label={alt}>
        {emoji}
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} {...props} />;
}
