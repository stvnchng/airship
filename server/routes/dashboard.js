const { Router } = require('express');
const db = require('../db');
const { getEligibleTenants, DEFAULT_DATE } = require('../services/eligibilityService');
const { normalizeZip } = require('../services/importService');

const router = Router();

const GET_MATCHED_COUNT = db.prepare(
  'SELECT COUNT(*) as count FROM historical_shipments WHERE tenant_id IS NOT NULL'
);

const GET_LAST_IMPORT = db.prepare(
  'SELECT imported_at, row_count, matched FROM import_log ORDER BY id DESC LIMIT 1'
);

const GET_LAST_EXPORT = db.prepare(
  'SELECT id, exported_at, as_of, tenant_count FROM export_batches ORDER BY id DESC LIMIT 1'
);

const GET_UNRESOLVED = db.prepare(
  'SELECT id, recipient_name, address1, city, state, zip, custom_field_1, review_reason, tenant_id FROM historical_shipments WHERE review_reason IS NOT NULL'
);

const GET_TENANT_NAME = db.prepare(
  "SELECT first_name || ' ' || last_name as name FROM tenants WHERE id = ?"
);

// For unmatched rows: zip neighbors with address for context.
const GET_ZIP_MATCHES = db.prepare(`
  SELECT id, first_name || ' ' || last_name as name, address1, city
  FROM tenants WHERE substr(zip, 1, 5) = ? LIMIT 3
`);

// For ambiguous rows: the exact conflicting tenants (same name+zip).
// Returns all of them so Doug can see why it's ambiguous and pick one.
const GET_AMBIGUOUS_MATCHES = db.prepare(`
  SELECT id, first_name || ' ' || last_name as name, address1, city
  FROM tenants
  WHERE lower(first_name) = lower(?) AND lower(last_name) = lower(?)
    AND substr(zip, 1, 5) = ?
`);

router.get('/', (req, res) => {
  try {
    const asOf = req.query.asOf || DEFAULT_DATE;
    const eligibleCount     = getEligibleTenants(asOf).length;
    const successfullyMatched = GET_MATCHED_COUNT.get().count;

    const queue = GET_UNRESOLVED.all().map(row => {
      const nameParts = row.recipient_name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName  = nameParts.slice(1).join(' ') || '';
      const zip       = normalizeZip(row.zip);

      // For ambiguous rows show the exact conflicting tenants (with address so Doug
      // can tell them apart). For unmatched show zip neighbors. For no_filter_size
      // the tenant is already linked — show their name instead of candidates.
      let potentialMatches = [];
      let matchedTenant = null;

      if (row.review_reason === 'ambiguous_match') {
        potentialMatches = GET_AMBIGUOUS_MATCHES.all(firstName, lastName, zip);
      } else if (row.review_reason === 'no_filter_size') {
        matchedTenant = row.tenant_id ? GET_TENANT_NAME.get(row.tenant_id) : null;
      } else {
        potentialMatches = GET_ZIP_MATCHES.all(zip);
      }

      return {
        id:             row.id,
        name:           row.recipient_name,
        address:        `${row.address1}, ${row.city} ${row.state}`,
        csv_size:       row.custom_field_1 || null,
        review_reason:  row.review_reason,
        matchedTenant:  matchedTenant?.name || null,
        potentialMatches,
      };
    });

    const lastImportDate = GET_LAST_IMPORT.get()?.imported_at ?? null;
    const lastExport = GET_LAST_EXPORT.get() || null;

    res.json({
      metrics: {
        eligibleTenants: eligibleCount,
        awaitingReview:  queue.length,
        successfullyMatched,
        lastImportDate,
        lastExport,
      },
      queue,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
