import React from 'react';

export default function Spinner({ size = 14 }) {
  return (
    <svg style={{ width: size, height: size, animation: 'spin 0.8s linear infinite' }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="15" strokeLinecap="round" />
    </svg>
  );
}
