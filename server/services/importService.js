const { parse } = require('csv-parse/sync');
const db = require('../db');

const INSERT_SHIPMENT = db.prepare(`
  INSERT INTO historical_shipments
    (tenant_id, recipient_name, address1, address2, city, state, zip,
     ship_date, tracking_number, source, custom_field_1)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ShipStation Import', ?)
`);

const FIND_DUPLICATE = db.prepare(
  'SELECT 1 FROM historical_shipments WHERE tracking_number = ?'
);

// Name + zip must both match to be considered a confident automatic match.
// Name-only risks false positives across the dataset; zip-only is almost
// certain to collide. Together they're still not perfect but confident enough
// to auto-link without manual review.
const FIND_TENANT_BY_NAME_AND_ZIP = db.prepare(`
  SELECT id FROM tenants
  WHERE lower(first_name) = lower(?)
    AND lower(last_name)  = lower(?)
    AND zip LIKE ?
  LIMIT 1
`);

function matchTenant(record) {
  const parts = record.name.trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName  = parts.slice(1).join(' ') || '';
  const zipPrefix = record.zip.substring(0, 5);
  return FIND_TENANT_BY_NAME_AND_ZIP.get(firstName, lastName, `${zipPrefix}%`);
}

function processImport(fileBuffer) {
  const records = parse(fileBuffer.toString('utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  let matched = 0, unresolved = 0, skipped = 0;

  db.transaction((rows) => {
    for (const row of rows) {
      const trackingNum = row.shipment_id;

      if (FIND_DUPLICATE.get(trackingNum)) {
        skipped++;
        continue;
      }

      const tenant = matchTenant(row);
      const tenantId = tenant ? tenant.id : null;
      if (tenantId) matched++; else unresolved++;

      // Normalize ISO timestamps (e.g. "2026-01-15T08:00:00Z") to plain dates
      const shipDate = row.ship_date ? row.ship_date.substring(0, 10) : null;

      INSERT_SHIPMENT.run(
        tenantId,
        row.name,
        row.address1,
        row.address2 || '',
        row.city,
        row.state,
        row.zip,
        shipDate,
        trackingNum,
        row.custom_field_1 || null,
      );
    }
  })(records);

  return { total: records.length, matched, unresolved, skipped };
}

module.exports = { processImport };
