import React, { useEffect } from 'react';

export default function SlideOver({ isOpen, onClose, title, subtitle, footer, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="slide-over-backdrop" onClick={onClose} />
      <div className="slide-over" role="dialog" aria-modal="true">
        <div className="slide-over-header">
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>{title}</div>
            {subtitle && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{subtitle}</div>
            )}
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="slide-over-body">
          {children}
        </div>

        {footer && (
          <div className="slide-over-footer">{footer}</div>
        )}
      </div>
    </>
  );
}
