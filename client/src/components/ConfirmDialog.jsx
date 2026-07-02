import React from 'react';

export default function ConfirmDialog({ open, title, body, confirmLabel = 'Proceed anyway', onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '24px',
          width: '380px',
          maxWidth: '90vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>⚠️</span>
          <div>
            <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)', marginBottom: '6px' }}>{title}</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{body}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={onCancel} style={{ fontSize: '13px', padding: '7px 16px' }}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={onConfirm}
            style={{ fontSize: '13px', padding: '7px 16px', background: '#EA580C', width: 'auto' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
