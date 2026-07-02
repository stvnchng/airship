import React, { useState, useRef } from 'react';
import Spinner from './Spinner';

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
      <div className="step-number" style={{ marginBottom: '10px' }}>01: Import</div>
      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
        Load ShipStation export
      </p>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5 }}>
        Upload a ShipStation CSV to import recent shipments and match them to tenants.
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

