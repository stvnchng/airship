import React from 'react';

export default function ActionQueue({ items = [], onMatch, onIgnore, onEditSize }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Queue header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>Review queue</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px' }}>
            Shipments that couldn't be matched automatically — link each one to a tenant or dismiss it.
          </p>
        </div>
        {items.length > 0 && (
          <span className="mono" style={{
            fontSize: '11px',
            fontWeight: 600,
            background: 'var(--amber-light)',
            color: 'var(--amber)',
            border: '1px solid #FDE68A',
            borderRadius: '20px',
            padding: '3px 10px',
            marginLeft: '16px',
            flexShrink: 0,
          }}>
            {items.length} pending
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <Empty />
      ) : (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 110px 1fr auto',
            gap: '0',
            padding: '10px 16px',
            background: 'var(--ground)',
            borderBottom: '1px solid var(--border)',
          }}>
            {['Recipient', 'Filter size', 'Closest match', ''].map((col, i) => (
              <span key={i} style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-muted)',
              }}>{col}</span>
            ))}
          </div>

          {/* Rows */}
          {items.map(item => (
            <div key={item.id} className="queue-row" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 110px 1fr auto',
              gap: '0',
              padding: '14px 16px',
              alignItems: 'center',
            }}>
              {/* Recipient */}
              <div>
                <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text)' }}>{item.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.address}</div>
              </div>

              {/* Filter size */}
              <div>
                {item.csv_size ? (
                  <button
                    className="size-badge"
                    onClick={() => onEditSize(item.id)}
                    title="Click to edit"
                    style={{ cursor: 'pointer', background: 'none', border: '1px solid var(--border)' }}
                  >
                    {item.csv_size}
                  </button>
                ) : (
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>—</span>
                )}
              </div>

              {/* Potential matches */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {item.potentialMatches && item.potentialMatches.length > 0 ? (
                  item.potentialMatches.map(match => (
                    <button
                      key={match.id}
                      className="btn-ghost"
                      onClick={() => onMatch(item.id, match.id, match.name)}
                    >
                      {match.name}
                    </button>
                  ))
                ) : (
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>No match found</span>
                )}
              </div>

              {/* Dismiss */}
              <button className="btn-dismiss" onClick={() => onIgnore(item.id)}>
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Empty() {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 32px',
      textAlign: 'center',
      background: 'var(--surface)',
      borderRadius: '10px',
      border: '1px solid var(--border)',
    }}>
      <div className="mono" style={{
        fontSize: '32px',
        fontWeight: 600,
        color: '#E2E8F0',
        marginBottom: '12px',
        lineHeight: 1,
      }}>∅</div>
      <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)', marginBottom: '6px' }}>
        Queue is clear
      </p>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '300px', lineHeight: 1.5 }}>
        All imports matched automatically, or no CSV has been loaded yet.
      </p>
    </div>
  );
}
