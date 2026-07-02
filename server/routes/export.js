const { Router } = require('express');
const db = require('../db');
const { getEligibleTenants, DEFAULT_DATE } = require('../services/eligibilityService');

const router = Router();

const insertShipment = db.prepare(
  `INSERT INTO shipments (tenant_id, ship_date, source) VALUES (?, ?, 'FilterFlow Export')`
);

router.post('/', (req, res) => {
  try {
    const asOf = req.query.asOf || DEFAULT_DATE;
    const tenants = getEligibleTenants(asOf);
    if (tenants.length === 0) {
      return res.status(400).json({ error: 'No eligible tenants to export' });
    }

    db.transaction(() => {
      for (const t of tenants) insertShipment.run(t.id, asOf);
    })();

    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = 'name,address1,address2,city,state,zip,custom_field_1';
    const rows = tenants.map(t =>
      [
        `${t.first_name} ${t.last_name}`,
        t.address1,
        t.address2,
        t.city,
        t.state,
        t.zip,
        t.last_filter_size,
      ].map(escape).join(',')
    );

    const csv = [headers, ...rows].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="shipment-export-${asOf}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
