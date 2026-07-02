const { Router } = require('express');
const db = require('../db');

const router = Router();

const GET_RECENT = db.prepare(`
  SELECT
    hs.id,
    hs.recipient_name,
    hs.address1, hs.city, hs.state, hs.zip,
    hs.ship_date,
    hs.custom_field_1  AS filter_size,
    hs.source,
    hs.tracking_number,
    t.first_name || ' ' || t.last_name AS tenant_name
  FROM historical_shipments hs
  LEFT JOIN tenants t ON hs.tenant_id = t.id
  WHERE hs.tenant_id IS NOT NULL
  ORDER BY hs.id DESC
  LIMIT 50
`);

router.get('/recent', (req, res) => {
  try {
    res.json({ imports: GET_RECENT.all() });
  } catch (err) {
    console.error('Imports fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
