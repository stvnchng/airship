import React from 'react';

export default function ExportCard({ onCalculate, eligibleCount, loading, onExport, exporting }) {
  return (
    <div style={{ padding: '20px' }}>

      {/* Step 02 — Eligibility */}
      <div className="step-number" style={{ marginBottom: '10px' }}>02 — Who's due</div>
      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
        Check eligibility
      </p>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5 }}>
        Finds tenants with an active air-filter rider who haven't received a shipment within their property's interval.
      </p>

      <button
        className="btn-primary"
        onClick={onCalculate}
        disabled={loading}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', marginBottom: '10px' }}
      >
        {loading ? <><Spinner /> Checking…</> : 'Run eligibility check'}
      </button>

      {eligibleCount > 0 && (
        <div style={{
          background: 'var(--success-light)',
          border: '1px solid #A7F3D0',
          borderRadius: '6px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '4px',
        }}>
          <span style={{ fontSize: '18px', fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--success)' }}>
            {eligibleCount}
          </span>
          <span style={{ fontSize: '12px', color: '#065F46' }}>
            tenant{eligibleCount !== 1 ? 's' : ''} ready to ship
          </span>
        </div>
      )}

      {/* Step 03 — Export */}
      <div className="step-number" style={{ marginBottom: '10px', marginTop: '24px' }}>03 — Export</div>
      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
        Send to ShipStation
      </p>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5 }}>
        Generates the shipment CSV and marks these tenants as ordered so they won't be included in the next run.
      </p>

      <button
        className="btn-primary"
        disabled={eligibleCount === 0 || exporting}
        onClick={onExport}
        style={{
          background: eligibleCount > 0 ? 'var(--success)' : undefined,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px'
        }}
      >
        {exporting ? <><Spinner /> Exporting…</> : `Export ${eligibleCount > 0 ? `${eligibleCount} shipments` : 'batch'}`}
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <svg style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="15" strokeLinecap="round" />
    </svg>
  );
}
