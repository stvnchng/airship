import React from 'react';
import Spinner from './Spinner';

export default function ExportCard({
  onCalculate, eligibleCount, loading, eligibilityChecked,
  onExport, onConfirmExport, onCancelExport, needsConfirm, exporting,
  lastExport, onRedownload,
}) {
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

      {needsConfirm ? (
        <div style={{
          background: '#FFF7ED',
          border: '1px solid #FED7AA',
          borderRadius: '6px',
          padding: '10px 12px',
        }}>
          <p style={{ fontSize: '12px', color: '#92400E', marginBottom: '10px', lineHeight: 1.5 }}>
            No ShipStation data has been imported. The eligible count may be overstated — tenants who already received a filter won't be excluded.
          </p>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="btn-primary"
              onClick={onConfirmExport}
              disabled={exporting}
              style={{ flex: 1, background: '#EA580C', fontSize: '12px', padding: '6px 0' }}
            >
              Export anyway
            </button>
            <button
              className="btn-ghost"
              onClick={onCancelExport}
              style={{ flex: 1, fontSize: '12px', padding: '6px 0' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {!eligibilityChecked && (
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: 1.4 }}>
              Run an eligibility check first to confirm who's in this batch.
            </p>
          )}
          <button
            className="btn-primary"
            disabled={!eligibilityChecked || eligibleCount === 0 || exporting}
            onClick={onExport}
            style={{
              background: eligibilityChecked && eligibleCount > 0 ? 'var(--success)' : undefined,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px'
            }}
          >
            {exporting ? <><Spinner /> Exporting…</> : `Export ${eligibleCount > 0 ? `${eligibleCount} shipments` : 'batch'}`}
          </button>
        </>
      )}
      {lastExport && (
        <button
          onClick={onRedownload}
          style={{
            marginTop: '8px',
            background: 'none',
            border: 'none',
            padding: 0,
            fontSize: '11px',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            textDecoration: 'underline',
            textDecorationStyle: 'dotted',
            width: '100%',
            textAlign: 'left',
          }}
        >
          Re-download last export — {lastExport.tenant_count} shipments, {lastExport.as_of}
        </button>
      )}
    </div>
  );
}

