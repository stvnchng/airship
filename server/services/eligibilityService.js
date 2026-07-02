const db = require('../db');

const DEFAULT_DATE = '2026-04-24';

// @asOf is a named binding reused across all clauses.
// Both shipments (our exports) and historical_shipments (ShipStation imports)
// count toward the interval window — an export blocks re-export within the
// cooldown period just like a confirmed delivery does.
const stmt = db.prepare(`
    WITH recently_shipped AS (
      SELECT hs.tenant_id
      FROM historical_shipments hs
      JOIN tenant_property tp ON hs.tenant_id = tp.tenant_id
      JOIN properties p ON tp.property_id = p.id
      WHERE hs.ship_date <= @asOf
        AND hs.ship_date >= date(@asOf, '-' || p.shipment_interval_days || ' days')
      UNION
      SELECT s.tenant_id
      FROM shipments s
      JOIN tenant_property tp ON s.tenant_id = tp.tenant_id
      JOIN properties p ON tp.property_id = p.id
      WHERE s.ship_date <= @asOf
        AND s.ship_date >= date(@asOf, '-' || p.shipment_interval_days || ' days')
    ),
    last_shipment AS (
      SELECT tenant_id, custom_field_1, ship_date
      FROM (
        SELECT tenant_id, custom_field_1, ship_date,
               ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY ship_date DESC) AS rn
        FROM historical_shipments
        WHERE ship_date <= @asOf
      )
      WHERE rn = 1
    )
    SELECT DISTINCT t.id, t.first_name, t.last_name,
                    t.address1, t.address2, t.city, t.state, t.zip,
                    ls.custom_field_1 AS last_filter_size,
                    ls.ship_date      AS last_ship_date
    FROM tenants t
    JOIN enrollments e ON t.id = e.tenant_id
    JOIN tenant_property tp ON t.id = tp.tenant_id
    LEFT JOIN last_shipment ls ON ls.tenant_id = t.id
    WHERE e.product = 'Renters Kit'
      AND e.active = 1
      AND e.riders LIKE '%Airfilters Delivery%'
      AND t.id NOT IN (SELECT tenant_id FROM recently_shipped)
  `);

function getEligibleTenants(asOf = DEFAULT_DATE) {
  return stmt.all({ asOf });
}

module.exports = { getEligibleTenants, DEFAULT_DATE };
