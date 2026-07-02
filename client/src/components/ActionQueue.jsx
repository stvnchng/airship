import React, { useState } from 'react';

const REASON_META = {
  unmatched:       { label: 'Unmatched',  instruction: 'Pick the correct tenant or dismiss.' },
  ambiguous_match: { label: 'Ambiguous',  instruction: 'Two tenants share this name and address — confirm which one.' },
  no_filter_size:  { label: 'No size',    instruction: 'Add a filter size if known, or dismiss to skip.' },
};

export default function ActionQueue({ items = [], onMatch, onIgnore, onEditSize }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>Review queue</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px' }}>
            Each row has one required action. Complete it or dismiss to clear the queue.
          </p>
        </div>
        {items.length > 0 && (
          <span className="mono" style={{
            fontSize: '11px', fontWeight: 600,
            background: 'var(--amber-light)', color: 'var(--amber)',
            border: '1px solid #FDE68A', borderRadius: '20px',
            padding: '3px 10px', marginLeft: '16px', flexShrink: 0,
          }}>
            {items.length} pending
          </span>
        )}
      </div>

      {items.length === 0
        ? <Empty />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {items.map(item => <QueueRow key={item.id} item={item} onMatch={onMatch} onIgnore={onIgnore} onEditSize={onEditSize} />)}
          </div>
      }
    </div>
  );
}

function QueueRow({ item, onMatch, onIgnore, onEditSize }) {
  const [sizeValue, setSizeValue] = useState(item.csv_size || '');
  const [sizeEditing, setSizeEditing] = useState(item.review_reason === 'no_filter_size');

  const meta = REASON_META[item.review_reason] || { label: item.review_reason, instruction: '' };

  const saveSize = () => {
    if (!sizeValue.trim()) return;
    onEditSize(item.id, sizeValue.trim());
    setSizeEditing(false);
  };

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '16px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>{item.name}</span>
            <ReasonBadge reason={item.review_reason} />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.address}</div>
        </div>
        <button
          className="btn-dismiss"
          onClick={() => onIgnore(item.id)}
        >
          Dismiss
        </button>
      </div>

      {/* Required action */}
      <p style={{ fontSize: '12px', color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '4px', padding: '6px 10px', marginBottom: '12px' }}>
        {meta.instruction}
      </p>

      {/* Action area — varies by reason */}
      {item.review_reason === 'no_filter_size' && (
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Matched to: <strong>{item.matchedTenant || '—'}</strong>
          </div>
          <SizeEditor
            value={sizeValue}
            onChange={setSizeValue}
            onSave={saveSize}
            autoFocus
          />
        </div>
      )}

      {(item.review_reason === 'ambiguous_match' || item.review_reason === 'unmatched') && (
        <div>
          {item.review_reason === 'ambiguous_match' && item.potentialMatches.length > 1 && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              These records share the same name and address — pick the one ShipStation shipped to, or dismiss if uncertain.
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {item.potentialMatches.length > 0 ? item.potentialMatches.map(match => (
              <button
                key={match.id}
                className="btn-ghost"
                onClick={() => onMatch(item.id, match.id, match.name)}
                style={{ textAlign: 'left' }}
              >
                <div style={{ fontWeight: 500 }}>{match.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                  {match.address1 ? `${match.address1}, ${match.city} · ` : ''}#{match.id}
                </div>
              </button>
            )) : (
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>No candidates found — dismiss if this row can't be matched.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SizeEditor({ value, onChange, onSave, autoFocus }) {
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(); }}
        placeholder="e.g. 16x20x1"
        style={{
          width: '140px', fontSize: '13px', padding: '6px 10px',
          border: '1px solid var(--border)', borderRadius: '5px',
          background: 'var(--surface)', color: 'var(--text)',
        }}
      />
      <button
        className="btn-primary"
        onClick={onSave}
        disabled={!value.trim()}
        style={{ fontSize: '12px', padding: '6px 12px', width: 'auto' }}
      >
        Save size
      </button>
    </div>
  );
}

function ReasonBadge({ reason }) {
  const styles = {
    unmatched:       { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    ambiguous_match: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    no_filter_size:  { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  }[reason] || { color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' };

  const labels = { unmatched: 'Unmatched', ambiguous_match: 'Ambiguous', no_filter_size: 'No size' };

  return (
    <span style={{
      fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px',
      color: styles.color, background: styles.bg, border: `1px solid ${styles.border}`,
    }}>
      {labels[reason] || reason}
    </span>
  );
}

function Empty() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '64px 32px', textAlign: 'center',
      background: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--border)',
    }}>
      <div className="mono" style={{ fontSize: '32px', fontWeight: 600, color: '#E2E8F0', marginBottom: '12px', lineHeight: 1 }}>∅</div>
      <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)', marginBottom: '6px' }}>Queue is clear</p>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '300px', lineHeight: 1.5 }}>
        All imports matched automatically, or no CSV has been loaded yet.
      </p>
    </div>
  );
}
