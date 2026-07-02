'use strict';

/**
 * Integration tests for importService.processImport()
 *
 * Uses an in-memory SQLite DB (hermetic — never touches database.db).
 * Each test gets a clean slate via afterEach truncation.
 */

jest.mock('../db', () => require('./helpers/testDbSingleton'));

const testDb = require('./helpers/testDbSingleton');

const { processImport } = require('../services/importService');

// ---------------------------------------------------------------------------
// CSV fixture builder
// ---------------------------------------------------------------------------

function makeCsvBuffer(rows) {
  const header = 'shipment_id,name,address1,address2,city,state,zip,ship_date,custom_field_1';
  const lines = rows.map(r =>
    [
      r.shipment_id || 'TRACK-' + Math.random().toString(36).slice(2),
      r.name || 'Test Tenant',
      r.address1 || '100 Main St',
      r.address2 || '',
      r.city || 'Beverly Hills',
      r.state || 'CA',
      r.zip || '90210',
      r.ship_date || '2026-01-15',
      r.custom_field_1 || '16x20x1',
    ].join(',')
  );
  return Buffer.from([header, ...lines].join('\n'), 'utf-8');
}

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

function insertTenant(id, firstName, lastName, zip = '90210') {
  testDb.prepare(
    `INSERT INTO tenants (id, first_name, last_name, address1, city, state, zip)
     VALUES (?, ?, ?, '100 Main St', 'Beverly Hills', 'CA', ?)`
  ).run(id, firstName, lastName, zip);
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

afterEach(() => {
  testDb.exec(`
    DELETE FROM historical_shipments;
    DELETE FROM tenants;
  `);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('processImport', () => {
  test('returns correct counts for a fully matched import', () => {
    insertTenant(1, 'Alice', 'Smith', '90210');

    const csv = makeCsvBuffer([
      { shipment_id: 'TRK-001', name: 'Alice Smith', zip: '90210' },
    ]);

    const result = processImport(csv);

    expect(result.total).toBe(1);
    expect(result.matched).toBe(1);
    expect(result.unresolved).toBe(0);
    expect(result.skipped).toBe(0);
  });

  test('auto-matches on case-insensitive name + zip', () => {
    insertTenant(2, 'Bob', 'Jones', '10001');

    const csv = makeCsvBuffer([
      { shipment_id: 'TRK-002', name: 'BOB JONES', zip: '10001' },
    ]);

    const result = processImport(csv);

    expect(result.matched).toBe(1);
    const row = testDb.prepare('SELECT tenant_id FROM historical_shipments WHERE tracking_number = ?').get('TRK-002');
    expect(row.tenant_id).toBe(2);
  });

  test('marks row as unresolved when no tenant matches', () => {
    // No tenants in the DB

    const csv = makeCsvBuffer([
      { shipment_id: 'TRK-003', name: 'Nonexistent Person', zip: '99999' },
    ]);

    const result = processImport(csv);

    expect(result.total).toBe(1);
    expect(result.matched).toBe(0);
    expect(result.unresolved).toBe(1);

    const row = testDb.prepare('SELECT tenant_id FROM historical_shipments WHERE tracking_number = ?').get('TRK-003');
    expect(row.tenant_id).toBeNull();
  });

  test('skips duplicate tracking numbers', () => {
    insertTenant(3, 'Carol', 'White', '30301');

    const csv = makeCsvBuffer([
      { shipment_id: 'TRK-DUP', name: 'Carol White', zip: '30301' },
    ]);

    // First import — succeeds
    processImport(csv);

    // Second import with the same tracking number — should be skipped
    const result = processImport(csv);

    expect(result.total).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.matched).toBe(0);

    const count = testDb.prepare(
      'SELECT COUNT(*) as c FROM historical_shipments WHERE tracking_number = ?'
    ).get('TRK-DUP');
    expect(count.c).toBe(1);
  });

  test('handles mixed matched, unresolved, and duplicate rows in one import', () => {
    insertTenant(4, 'Dave', 'Black', '77001');

    // Pre-seed a duplicate
    testDb.prepare(
      `INSERT INTO historical_shipments
         (tenant_id, recipient_name, address1, city, state, zip, ship_date, tracking_number, source)
       VALUES (4, 'Dave Black', '100 Main', 'Houston', 'TX', '77001', '2025-12-01', 'EXISTING', 'ShipStation Import')`
    ).run();

    const csv = makeCsvBuffer([
      { shipment_id: 'TRK-NEW', name: 'Dave Black', zip: '77001' },        // matched
      { shipment_id: 'TRK-UNKNOWN', name: 'Ghost Person', zip: '00000' },   // unresolved
      { shipment_id: 'EXISTING', name: 'Dave Black', zip: '77001' },        // duplicate
    ]);

    const result = processImport(csv);

    expect(result.total).toBe(3);
    expect(result.matched).toBe(1);
    expect(result.unresolved).toBe(1);
    expect(result.skipped).toBe(1);
  });

  test('normalizes ISO timestamp ship dates to YYYY-MM-DD', () => {
    const csv = makeCsvBuffer([
      { shipment_id: 'TRK-ISO', name: 'Iso Date', zip: '90210', ship_date: '2026-01-15T08:00:00Z' },
    ]);

    processImport(csv);

    const row = testDb.prepare('SELECT ship_date FROM historical_shipments WHERE tracking_number = ?').get('TRK-ISO');
    expect(row.ship_date).toBe('2026-01-15');
  });

  test('stores source as ShipStation Import for all rows', () => {
    const csv = makeCsvBuffer([
      { shipment_id: 'TRK-SRC', name: 'Source Check', zip: '90210' },
    ]);

    processImport(csv);

    const row = testDb.prepare('SELECT source FROM historical_shipments WHERE tracking_number = ?').get('TRK-SRC');
    expect(row.source).toBe('ShipStation Import');
  });

  test('stores custom_field_1 when provided', () => {
    const csv = makeCsvBuffer([
      { shipment_id: 'TRK-CF1', name: 'Filter Size', zip: '90210', custom_field_1: '20x25x1' },
    ]);

    processImport(csv);

    const row = testDb.prepare('SELECT custom_field_1 FROM historical_shipments WHERE tracking_number = ?').get('TRK-CF1');
    expect(row.custom_field_1).toBe('20x25x1');
  });

  test('stores null custom_field_1 when column is blank', () => {
    // Build the CSV manually to guarantee an empty custom_field_1 column
    const csvRaw =
      'shipment_id,name,address1,address2,city,state,zip,ship_date,custom_field_1\n' +
      'TRK-NOCF,No Filter,100 Main,,Beverly Hills,CA,90210,2026-01-15,';
    const csv = Buffer.from(csvRaw, 'utf-8');

    processImport(csv);

    const row = testDb.prepare('SELECT custom_field_1 FROM historical_shipments WHERE tracking_number = ?').get('TRK-NOCF');
    expect(row.custom_field_1).toBeNull();
  });

  test('returns zeros for an empty CSV', () => {
    const csv = Buffer.from('shipment_id,name,address1,address2,city,state,zip,ship_date,custom_field_1\n', 'utf-8');

    const result = processImport(csv);

    expect(result.total).toBe(0);
    expect(result.matched).toBe(0);
    expect(result.unresolved).toBe(0);
    expect(result.skipped).toBe(0);
  });

  test('does not match tenant when only name matches but zip differs', () => {
    insertTenant(5, 'Name', 'Match', '11111');

    const csv = makeCsvBuffer([
      { shipment_id: 'TRK-ZIPWRONG', name: 'Name Match', zip: '99999' },
    ]);

    const result = processImport(csv);

    expect(result.matched).toBe(0);
    expect(result.unresolved).toBe(1);
  });
});
