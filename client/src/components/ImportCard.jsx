import React, { useState, useRef } from 'react';

export default function ImportCard({ onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (file && file.name.endsWith('.csv')) setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!selectedFile || isUploading) return;
    setIsUploading(true);
    try {
      await onUploadSuccess(selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (_) {
      // error already toasted upstream
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div className="step-number" style={{ marginBottom: '10px' }}>01 — Import</div>
      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
        Load ShipStation export
      </p>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5 }}>
        Upload the CSV from ShipStation to match tracking data to tenants.
      </p>

      {/* Drop zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `1.5px dashed ${isDragging ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragging ? 'var(--accent-light)' : 'rgba(255,255,255,0.6)',
          transition: 'all 0.15s',
          marginBottom: '10px',
        }}
      >
        {selectedFile ? (
          <span className="mono" style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 500 }}>
            {selectedFile.name}
          </span>
        ) : (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Drop CSV here or <span style={{ color: 'var(--accent)', fontWeight: 500 }}>browse</span>
          </span>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={e => handleFile(e.target.files?.[0])}
          style={{ display: 'none' }}
        />
      </div>

      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={!selectedFile || isUploading}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}
      >
        {isUploading ? (
          <>
            <Spinner /> Importing…
          </>
        ) : 'Import CSV'}
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <svg style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }} viewBox="0 0 24 24" fill="none">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="15" strokeLinecap="round" />
    </svg>
  );
}
