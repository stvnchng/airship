import React, { useEffect } from 'react';

const STYLES = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error:   'bg-red-50 border-red-200 text-red-800',
  info:    'bg-blue-50 border-blue-200 text-blue-800',
};

const ICONS = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
};

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div style={{animation: 'toast-in 0.2s ease'}} className={`flex items-start gap-3 px-4 py-3 border rounded-xl shadow-md text-sm ${STYLES[toast.type] || STYLES.info}`}>
      <span className="font-bold flex-shrink-0">{ICONS[toast.type] || ICONS.info}</span>
      <span className="flex-1">{toast.message}</span>
      <button onClick={onDismiss} className="opacity-50 hover:opacity-100 font-bold cursor-pointer flex-shrink-0">✕</button>
    </div>
  );
}

export default function Toast({ toasts, dismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}
