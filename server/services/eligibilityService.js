const db = require('../db');

const DEFAULT_DATE = '2026-04-24';

const stmt = db.prepare(`
    WITH interval_per_tenant AS (
      SELECT pt.tenant_id, MAX(p.shipment_interval_days) AS max_interval
      FROM property_tenants pt
      JOIN properties p ON pt.property_id = p.id
      GROUP BY pt.tenant_id
    ),
    recently_shipped AS (
      SELECT DISTINCT hs.tenant_id
      FROM historical_shipments hs
      JOIN interval_per_tenant ipt ON hs.tenant_id = ipt.tenant_id
      WHERE hs.tenant_id IS NOT NULL
        AND hs.ship_date <= ?
        AND hs.ship_date >= date(?, '-' || ipt.max_interval || ' days')
    ),
    also_in_export AS (
      SELECT DISTINCT s.tenant_id FROM shipments s
    )
    SELECT DISTINCT t.id, t.first_name, t.last_name,
                    t.address1, t.address2, t.city, t.state, t.zip,
                    (SELECT hs.custom_field_1 FROM historical_shipments hs
                     WHERE hs.tenant_id = t.id AND hs.ship_date <= ?
                     ORDER BY hs.ship_date DESC LIMIT 1) AS last_filter_size,
                    (SELECT hs.ship_date FROM historical_shipments hs
                     WHERE hs.tenant_id = t.id AND hs.ship_date <= ?
                     ORDER BY hs.ship_date DESC LIMIT 1) AS last_ship_date
    FROM tenants t
    JOIN enrollments e ON t.id = e.tenant_id
    JOIN interval_per_tenant ipt ON t.id = ipt.tenant_id
    WHERE e.product = 'Renters Kit'
      AND (e.active = 1 OR e.active = 'true')
      AND (e.riders LIKE '%Airfilters Delivery%')
      AND t.id NOT IN (SELECT tenant_id FROM recently_shipped)
      AND t.id NOT IN (SELECT tenant_id FROM also_in_export)
  `);

function getEligibleTenants(asOf = DEFAULT_DATE) {
  return stmt.all(asOf, asOf, asOf, asOf);
}

module.exports = { getEligibleTenants, DEFAULT_DATE };
