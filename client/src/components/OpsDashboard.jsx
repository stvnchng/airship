import React, { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import ImportCard from './ImportCard';
import ExportCard from './ExportCard';
import ActionQueue from './ActionQueue';
import SlideOver from './SlideOver';

const DEFAULT_DATE = '2026-04-24';

function daysSince(dateStr, asOf) {
  if (!dateStr) return null;
  const diff = new Date(asOf) - new Date(dateStr.substring(0, 10));
  return Math.floor(diff / 86400000);
}

export default function OpsDashboard() {
  const [asOf, setAsOf]               = useState(DEFAULT_DATE);
  const [metrics, setMetrics]         = useState({ eligibleTenants: 0, pendingExport: 0, awaitingReview: 0, successfullyMatched: 0 });
  const [reviewItems, setReviewItems] = useState([]);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Slide-over state
  const [panel, setPanel]               = useState(null); // 'eligible' | 'imports'
  const [eligibleList, setEligibleList] = useState([]);
  const [importList, setImportList]     = useState([]);
  const [panelLoading, setPanelLoading] = useState(false);

  const refreshDashboard = useCallback(() => {
    fetch(`/api/dashboard?asOf=${asOf}`)
      .then(res => { if (!res.ok) throw new Error('Server error'); return res.json(); })
      .then(data => {
        setMetrics(data.metrics || {});
        setReviewItems(data.queue || []);
      })
      .catch(err => toast.error(err.message));
  }, [asOf]);

  useEffect(() => { refreshDashboard(); }, [refreshDashboard]);

  const openPanel = (type) => {
    setPanel(type);
    setPanelLoading(true);

    const url = type === 'eligible' ? `/api/eligibility?asOf=${asOf}` : '/api/imports/recent';
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (type === 'eligible') setEligibleList(data.tenants || []);
        else setImportList(data.imports || []);
      })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setPanelLoading(false));
  };

  const handleCsvIngest = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetch('/api/ingest', { method: 'POST', body: formData })
      .then(res => { if (!res.ok) return res.json().then(e => { throw new Error(e.error); }); return res.json(); })
      .then(data => { toast.success(data.message); refreshDashboard(); })
      .catch(err => { toast.error(err.message); throw err; });
  };

  const handleCalculateEligibility = () => {
    setCheckingEligibility(true);
    fetch(`/api/eligibility?asOf=${asOf}`)
      .then(res => res.json())
      .then(data => {
        setMetrics(prev => ({ ...prev, eligibleTenants: data.count }));
        setEligibleList(data.tenants || []);
        toast.success(`${data.count} tenant${data.count !== 1 ? 's' : ''} ready to ship as of ${data.asOf}`);
      })
      .catch(() => toast.error('Eligibility check failed'))
      .finally(() => setCheckingEligibility(false));
  };

  const handleResolveMatch = (rowId, tenantId, tenantName) => {
    setReviewItems(prev => prev.filter(item => item.id !== rowId));
    setMetrics(prev => ({ ...prev, awaitingReview: Math.max(0, prev.awaitingReview - 1), successfullyMatched: prev.successfullyMatched + 1 }));
    toast.success(`Linked to ${tenantName}`);
  };

  const handleIgnoreRow = (rowId) => {
    setReviewItems(prev => prev.filter(item => item.id !== rowId));
    setMetrics(prev => ({ ...prev, awaitingReview: Math.max(0, prev.awaitingReview - 1) }));
    toast('Row dismissed');
  };

  const handleExport = () => {
    setExporting(true);
    fetch(`/api/export?asOf=${asOf}`, { method: 'POST' })
      .then(res => {
        if (!res.ok) return res.json().then(e => { throw new Error(e.error); });
        return res.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shipment-export-${asOf}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Exported ${metrics.eligibleTenants} shipment${metrics.eligibleTenants !== 1 ? 's' : ''}`);
        setPanel(null);
        setEligibleList([]);
        refreshDashboard();
      })
      .catch(err => toast.error(err.message || 'Export failed'))
      .finally(() => setExporting(false));
  };

  const handleEditSize = (rowId) => {
    const target = reviewItems.find(item => item.id === rowId);
    const newSize = prompt(`Edit filter size for ${target.name}:`, target.csv_size);
    if (newSize !== null && newSize !== target.csv_size) {
      setReviewItems(prev => prev.map(item => item.id === rowId ? { ...item, csv_size: newSize } : item));
      toast.success('Filter size updated');
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Toaster position="top-right" richColors closeButton />

      {/* Header */}
      <header style={{
        backgroundColor: 'var(--nav)',
        height: '48px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
      }}>
        <span className="mono" style={{ fontWeight: 600, fontSize: '13px', letterSpacing: '0.1em', color: 'white' }}>
          FILTERFLOW
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className="metric-btn"
            onClick={() => setPanel(null)}
            style={{ color: metrics.awaitingReview > 0 ? '#FCD34D' : '#64748B' }}
          >
            {metrics.awaitingReview} to review
          </button>
          <span style={{ color: '#334155', fontSize: '11px' }}>·</span>
          <button
            className="metric-btn"
            onClick={() => openPanel('eligible')}
            style={{ color: '#34D399' }}
            title="View eligible tenants"
          >
            {metrics.eligibleTenants} eligible
          </button>
          <span style={{ color: '#334155', fontSize: '11px' }}>·</span>
          <button
            className="metric-btn"
            onClick={() => openPanel('imports')}
            style={{ color: '#64748B' }}
            title="View recent imports"
          >
            {metrics.successfullyMatched} imported
          </button>
        </div>

        <span className="metric-chip" style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
          as of
          <input
            type="date"
            className="date-input"
            value={asOf}
            onChange={e => e.target.value && setAsOf(e.target.value)}
            title="Change the reference date for eligibility"
          />
          · Doug
        </span>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Sidebar */}
        <aside className="sidebar-dot-grid" style={{
          width: '272px',
          flexShrink: 0,
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}>
          <ImportCard onUploadSuccess={handleCsvIngest} />
          <div className="step-divider" />
          <ExportCard
            onCalculate={handleCalculateEligibility}
            eligibleCount={metrics.eligibleTenants}
            loading={checkingEligibility}
            onExport={handleExport}
            exporting={exporting}
          />
        </aside>

        {/* Main */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          <ActionQueue
            items={reviewItems}
            onMatch={handleResolveMatch}
            onIgnore={handleIgnoreRow}
            onEditSize={handleEditSize}
          />
        </main>
      </div>

      {/* Eligible tenants panel */}
      <SlideOver
        isOpen={panel === 'eligible'}
        onClose={() => setPanel(null)}
        title="Ready to ship"
        subtitle={`${eligibleList.length} tenant${eligibleList.length !== 1 ? 's' : ''} due for a filter as of ${asOf}`}
        footer={
          eligibleList.length > 0 && (
            <button
              className="btn-primary"
              style={{ background: 'var(--success)' }}
              disabled={exporting}
              onClick={handleExport}
            >
              {exporting ? 'Exporting…' : `Export ${eligibleList.length} shipments`}
            </button>
          )
        }
      >
        {panelLoading ? (
          <PanelSpinner />
        ) : eligibleList.length === 0 ? (
          <PanelEmpty message="No tenants are currently eligible." />
        ) : (
          eligibleList.map(t => (
            <div key={t.id} className="slide-over-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text)' }}>
                  {t.first_name} {t.last_name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.address1}{t.address2 ? ` ${t.address2}` : ''}, {t.city} {t.state}
                </div>
                {t.last_ship_date && (
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>
                    Last shipped {daysSince(t.last_ship_date, asOf)} days ago
                  </div>
                )}
                {!t.last_ship_date && (
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>
                    First shipment
                  </div>
                )}
              </div>
              <span className="size-badge" style={{ flexShrink: 0 }}>
                {t.last_filter_size || '—'}
              </span>
            </div>
          ))
        )}
      </SlideOver>

      {/* Import history panel */}
      <SlideOver
        isOpen={panel === 'imports'}
        onClose={() => setPanel(null)}
        title="Import history"
        subtitle={`Last ${importList.length} matched shipments`}
      >
        {panelLoading ? (
          <PanelSpinner />
        ) : importList.length === 0 ? (
          <PanelEmpty message="No imports yet. Upload a ShipStation CSV to get started." />
        ) : (
          importList.map(row => (
            <div key={row.id} className="slide-over-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text)' }}>
                  {row.recipient_name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  → {row.tenant_name}
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>
                  {row.ship_date} · {row.tracking_number}
                </div>
              </div>
              <span className="size-badge" style={{ flexShrink: 0 }}>
                {row.filter_size || '—'}
              </span>
            </div>
          ))
        )}
      </SlideOver>
    </div>
  );
}

function PanelSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
      <svg style={{ width: 20, height: 20, animation: 'spin 0.8s linear infinite', color: 'var(--text-muted)' }} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="15" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function PanelEmpty({ message }) {
  return (
    <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
      {message}
    </div>
  );
}
