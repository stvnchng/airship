const db = require('../db');

const DEFAULT_DATE = '2026-04-24';

// @asOf lets SQLite reuse the single asOf binding across all clauses.
// Both shipments (our exports) and historical_shipments (ShipStation imports)
// count toward the interval window — an export blocks re-export within the
// cooldown period just like a confirmed delivery does.
const stmt = db.prepare(`
    WITH recently_shipped AS (
      SELECT DISTINCT hs.tenant_id
      FROM historical_shipments hs
      JOIN tenant_property tp ON hs.tenant_id = tp.tenant_id
      JOIN properties p ON tp.property_id = p.id
      WHERE hs.tenant_id IS NOT NULL
        AND hs.ship_date <= @asOf
        AND hs.ship_date >= date(@asOf, '-' || p.shipment_interval_days || ' days')
      UNION
      SELECT DISTINCT s.tenant_id
      FROM shipments s
      JOIN tenant_property tp ON s.tenant_id = tp.tenant_id
      JOIN properties p ON tp.property_id = p.id
      WHERE s.ship_date <= @asOf
        AND s.ship_date >= date(@asOf, '-' || p.shipment_interval_days || ' days')
    )
    SELECT DISTINCT t.id, t.first_name, t.last_name,
                    t.address1, t.address2, t.city, t.state, t.zip,
                    (SELECT hs.custom_field_1 FROM historical_shipments hs
                     WHERE hs.tenant_id = t.id AND hs.ship_date <= @asOf
                     ORDER BY hs.ship_date DESC LIMIT 1) AS last_filter_size,
                    (SELECT hs.ship_date FROM historical_shipments hs
                     WHERE hs.tenant_id = t.id AND hs.ship_date <= @asOf
                     ORDER BY hs.ship_date DESC LIMIT 1) AS last_ship_date
    FROM tenants t
    JOIN enrollments e ON t.id = e.tenant_id
    JOIN tenant_property tp ON t.id = tp.tenant_id
    WHERE e.product = 'Renters Kit'
      AND (e.active = 1 OR e.active = 'true')
      AND (e.riders LIKE '%Airfilters Delivery%')
      AND t.id NOT IN (SELECT tenant_id FROM recently_shipped)
  `);

function getEligibleTenants(asOf = DEFAULT_DATE) {
  return stmt.all({ asOf });
}

module.exports = { getEligibleTenants, DEFAULT_DATE };
