import React from 'react';

export default function MetricsBar({ metrics }) {
  const items = [
    { label: "Eligible Tenants Today", val: metrics.eligibleTenants, styles: "text-gray-900" },
    { label: "Pending Export Batch", val: metrics.pendingExport, styles: "text-blue-600" },
    { label: "Awaiting Manual Review", val: metrics.awaitingReview, styles: "text-amber-600" },
    { label: "Successfully Matched", val: metrics.successfullyMatched, styles: "text-green-600" },
  ];
  return (
    <section className="grid grid-cols-1 md:grid-cols-4 gap-5">
      {items.map((m, idx) => (
        <div key={idx} className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{m.label}</span>
          <p className={`text-3xl font-bold mt-1 ${m.styles}`}>{m.val}</p>
        </div>
      ))}
    </section>
  );
}