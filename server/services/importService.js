const { parse } = require('csv-parse/sync');
const db = require('../db');

const INSERT_SHIPMENT = db.prepare(`
  INSERT INTO historical_shipments
    (tenant_id, recipient_name, address1, address2, city, state, zip,
     ship_date, tracking_number, source, custom_field_1, review_reason)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ShipStation Import', ?, ?)
`);

const FIND_DUPLICATE = db.prepare(
  'SELECT 1 FROM historical_shipments WHERE tracking_number = ?'
);

// Count how many tenants match name+zip before committing to one.
// More than one match means we cannot auto-select with confidence.
const COUNT_MATCHES = db.prepare(`
  SELECT COUNT(*) as n FROM tenants
  WHERE lower(first_name) = lower(?)
    AND lower(last_name)  = lower(?)
    AND substr(zip, 1, 5) = ?
`);

// Name + zip must both match to be a confident auto-link.
// Zip normalization: ShipStation CSVs sometimes omit the leading zero
// (e.g. "3095" instead of "03095"). We left-pad to 5 digits and compare
// against substr(zip, 1, 5) to handle both 5- and ZIP+4 formats.
const FIND_TENANT_BY_NAME_AND_ZIP = db.prepare(`
  SELECT id FROM tenants
  WHERE lower(first_name) = lower(?)
    AND lower(last_name)  = lower(?)
    AND substr(zip, 1, 5) = ?
  LIMIT 1
`);

function normalizeZip(raw) {
  return (raw || '').replace(/[^0-9]/g, '').substring(0, 5).padStart(5, '0');
}

// Returns { tenantId, reviewReason }
// reviewReason is null for clean matches, set when human review is needed.
function classify(row) {
  const parts = row.name.trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName  = parts.slice(1).join(' ') || '';
  const zip       = normalizeZip(row.zip);

  const { n } = COUNT_MATCHES.get(firstName, lastName, zip);

  if (n === 0) {
    return { tenantId: null, reviewReason: 'unmatched' };
  }

  const tenant = FIND_TENANT_BY_NAME_AND_ZIP.get(firstName, lastName, zip);

  if (n > 1) {
    // Multiple tenants share the same name+zip — auto-select the first but
    // flag so Doug can confirm the right one. Not safe to silently pick.
    return { tenantId: tenant.id, reviewReason: 'ambiguous_match' };
  }

  if (!row.custom_field_1) {
    // Matched confidently, but no filter size. Export CSV will have a blank
    // custom_field_1, which ShipStation can't act on.
    return { tenantId: tenant.id, reviewReason: 'no_filter_size' };
  }

  return { tenantId: tenant.id, reviewReason: null };
}

function processImport(fileBuffer) {
  const records = parse(fileBuffer.toString('utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  let matched = 0, flagged = 0, skipped = 0;

  db.transaction((rows) => {
    for (const row of rows) {
      const trackingNum = row.shipment_id;

      if (FIND_DUPLICATE.get(trackingNum)) {
        skipped++;
        continue;
      }

      const { tenantId, reviewReason } = classify(row);
      if (tenantId && !reviewReason) matched++;
      else flagged++;

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
        reviewReason,
      );
    }
  })(records);

  return { total: records.length, matched, flagged, skipped };
}

module.exports = { processImport, normalizeZip };
