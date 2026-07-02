const { Router } = require('express');
const db = require('../db');
const { getEligibleTenants, DEFAULT_DATE } = require('../services/eligibilityService');

const router = Router();

const insertShipment = db.prepare(
  `INSERT INTO shipments (tenant_id, ship_date, source) VALUES (?, ?, 'FilterFlow Export')`
);
const insertBatch = db.prepare(
  `INSERT INTO export_batches (exported_at, as_of, tenant_count, csv_content) VALUES (?, ?, ?, ?)`
);
const getLastBatch = db.prepare(
  `SELECT id, exported_at, as_of, tenant_count, csv_content FROM export_batches ORDER BY id DESC LIMIT 1`
);

function buildCsv(tenants) {
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const headers = 'name,address1,address2,city,state,zip,custom_field_1';
  const rows = tenants.map(t =>
    [`${t.first_name} ${t.last_name}`, t.address1, t.address2, t.city, t.state, t.zip, t.last_filter_size]
      .map(escape).join(',')
  );
  return [headers, ...rows].join('\r\n');
}

router.post('/', (req, res) => {
  try {
    const asOf = req.query.asOf || DEFAULT_DATE;
    const tenants = getEligibleTenants(asOf);
    if (tenants.length === 0) {
      return res.status(400).json({ error: 'No eligible tenants to export' });
    }

    const csv = buildCsv(tenants);
    const exportedAt = new Date().toISOString();

    db.transaction(() => {
      for (const t of tenants) insertShipment.run(t.id, asOf);
      insertBatch.run(exportedAt, asOf, tenants.length, csv);
    })();

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="shipment-export-${asOf}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/last', (req, res) => {
  try {
    const batch = getLastBatch.get();
    if (!batch) return res.status(404).json({ error: 'No exports yet' });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="shipment-export-${batch.as_of}.csv"`);
    res.send(batch.csv_content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
