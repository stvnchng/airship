const { Router } = require('express');
const db = require('../db');
const { getEligibleTenants, DEFAULT_DATE } = require('../services/eligibilityService');

const router = Router();

const GET_MATCHED_COUNT = db.prepare(
  'SELECT COUNT(*) as count FROM historical_shipments WHERE tenant_id IS NOT NULL'
);

const GET_UNRESOLVED = db.prepare(
  'SELECT id, recipient_name, address1, city, state, zip, custom_field_1 FROM historical_shipments WHERE tenant_id IS NULL'
);

const GET_POTENTIAL_MATCHES = db.prepare(
  'SELECT id, first_name || \' \' || last_name as name FROM tenants WHERE zip = ? LIMIT 3'
);

router.get('/', (req, res) => {
  try {
    const asOf = req.query.asOf || DEFAULT_DATE;
    const eligibleCount     = getEligibleTenants(asOf).length;
    const successfullyMatched = GET_MATCHED_COUNT.get().count;

    const queue = GET_UNRESOLVED.all().map(row => ({
      id:   row.id,
      name: row.recipient_name,
      address: `${row.address1}, ${row.city} ${row.state}`,
      csv_size: row.custom_field_1 || null,
      potentialMatches: GET_POTENTIAL_MATCHES.all(row.zip),
    }));

    res.json({
      metrics: {
        eligibleTenants:    eligibleCount,
        pendingExport:      0,
        awaitingReview:     queue.length,
        successfullyMatched,
      },
      queue,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
