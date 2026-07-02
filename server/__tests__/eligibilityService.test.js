'use strict';

/**
 * Unit tests for eligibilityService.js
 *
 * Strategy: the service module calls db.prepare() at the top level, so we
 * cannot simply require it and swap out the DB after the fact.  Instead we
 * use jest.mock to replace '../db' with our own in-memory instance before the
 * module cache picks up the real file.
 *
 * Each describe block seeds the in-memory DB from scratch so tests are fully
 * independent of each other.
 */

// jest.mock() is hoisted above all variable declarations, so the factory
// cannot reference a variable from this file.  Instead we require the DB from
// a shared singleton module that is already resolved when the factory runs.
jest.mock('../db', () => require('./helpers/testDbSingleton'));

const testDb = require('./helpers/testDbSingleton');

// NOW we can safely require the service (its top-level db.prepare calls will
// hit the in-memory DB that jest.mock installed).
const { getEligibleTenants, DEFAULT_DATE } = require('../services/eligibilityService');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function insertTenant(id, firstName, lastName, zip = '90210') {
  testDb.prepare(
    `INSERT INTO tenants (id, first_name, last_name, address1, city, state, zip)
     VALUES (?, ?, ?, '100 Main St', 'Beverly Hills', 'CA', ?)`
  ).run(id, firstName, lastName, zip);
}

function enrollTenant(tenantId, active = 1) {
  testDb.prepare(
    `INSERT INTO enrollments (active, tenant_id, product, riders)
     VALUES (?, ?, 'Renters Kit', 'Airfilters Delivery')`
  ).run(active, tenantId);
}

function addProperty(id = 'prop-1', intervalDays = 90) {
  testDb.prepare(
    `INSERT OR IGNORE INTO properties (id, name, shipment_interval_days) VALUES (?, 'Test Property', ?)`
  ).run(id, intervalDays);
}

function linkTenantProperty(tenantId, propertyId = 'prop-1') {
  testDb.prepare(
    `INSERT OR IGNORE INTO property_tenants (property_id, tenant_id) VALUES (?, ?)`
  ).run(propertyId, tenantId);
}

function addHistoricalShipment(tenantId, shipDate, trackingNum) {
  testDb.prepare(
    `INSERT INTO historical_shipments
       (tenant_id, recipient_name, address1, city, state, zip, ship_date, tracking_number, source)
     VALUES (?, 'Test Tenant', '100 Main St', 'Beverly Hills', 'CA', '90210', ?, ?, 'Test')`
  ).run(tenantId, shipDate, trackingNum);
}

function addToExportQueue(tenantId) {
  testDb.prepare(
    `INSERT INTO shipments (tenant_id, ship_date) VALUES (?, '${DEFAULT_DATE}')`
  ).run(tenantId);
}

// Clean all tables between each test
afterEach(() => {
  testDb.exec(`
    DELETE FROM shipments;
    DELETE FROM historical_shipments;
    DELETE FROM property_tenants;
    DELETE FROM enrollments;
    DELETE FROM properties;
    DELETE FROM tenants;
  `);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getEligibleTenants', () => {
  test('returns a tenant who meets all eligibility criteria', () => {
    insertTenant(1, 'Alice', 'Smith');
    enrollTenant(1);
    addProperty('prop-1', 90);
    linkTenantProperty(1);

    const results = getEligibleTenants(DEFAULT_DATE);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(1);
    expect(results[0].first_name).toBe('Alice');
  });

  test('excludes tenant with inactive enrollment', () => {
    insertTenant(2, 'Bob', 'Jones');
    enrollTenant(2, 0); // active = false
    addProperty('prop-1', 90);
    linkTenantProperty(2);

    const results = getEligibleTenants(DEFAULT_DATE);

    expect(results).toHaveLength(0);
  });

  test('excludes tenant whose enrollment riders do not include Airfilters Delivery', () => {
    insertTenant(3, 'Carol', 'White');
    testDb.prepare(
      `INSERT INTO enrollments (active, tenant_id, product, riders)
       VALUES (1, 3, 'Renters Kit', 'Credit Reporting')`
    ).run();
    addProperty('prop-1', 90);
    linkTenantProperty(3);

    const results = getEligibleTenants(DEFAULT_DATE);

    expect(results).toHaveLength(0);
  });

  test('excludes tenant enrolled in wrong product', () => {
    insertTenant(4, 'Dave', 'Black');
    testDb.prepare(
      `INSERT INTO enrollments (active, tenant_id, product, riders)
       VALUES (1, 4, 'TLL', 'Airfilters Delivery')`
    ).run();
    addProperty('prop-1', 90);
    linkTenantProperty(4);

    const results = getEligibleTenants(DEFAULT_DATE);

    expect(results).toHaveLength(0);
  });

  test('excludes tenant shipped within the interval window', () => {
    insertTenant(5, 'Eve', 'Green');
    enrollTenant(5);
    addProperty('prop-1', 90);
    linkTenantProperty(5);
    // Ship date 30 days before asOf (well within the 90-day window)
    addHistoricalShipment(5, '2026-03-25', 'TRACK-001');

    const results = getEligibleTenants(DEFAULT_DATE);

    expect(results).toHaveLength(0);
  });

  test('includes tenant whose last shipment is older than the interval', () => {
    insertTenant(6, 'Frank', 'Hill');
    enrollTenant(6);
    addProperty('prop-1', 90);
    linkTenantProperty(6);
    // Ship date 100 days before DEFAULT_DATE (2026-04-24 minus 100 = 2026-01-14)
    addHistoricalShipment(6, '2026-01-14', 'TRACK-002');

    const results = getEligibleTenants(DEFAULT_DATE);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(6);
  });

  test('excludes tenant already in the export queue (shipments table)', () => {
    insertTenant(7, 'Grace', 'Lake');
    enrollTenant(7);
    addProperty('prop-1', 90);
    linkTenantProperty(7);
    addToExportQueue(7);

    const results = getEligibleTenants(DEFAULT_DATE);

    expect(results).toHaveLength(0);
  });

  test('includes last_filter_size and last_ship_date from most recent historical shipment', () => {
    insertTenant(8, 'Hank', 'Moore');
    enrollTenant(8);
    addProperty('prop-1', 90);
    linkTenantProperty(8);

    // Two historical shipments — the older one should NOT be returned
    testDb.prepare(
      `INSERT INTO historical_shipments
         (tenant_id, recipient_name, address1, city, state, zip, ship_date, tracking_number, source, custom_field_1)
       VALUES (8, 'Hank Moore', '100 Main', 'BH', 'CA', '90210', '2025-06-01', 'OLD-TRACK', 'Test', '16x20x1')`
    ).run();
    testDb.prepare(
      `INSERT INTO historical_shipments
         (tenant_id, recipient_name, address1, city, state, zip, ship_date, tracking_number, source, custom_field_1)
       VALUES (8, 'Hank Moore', '100 Main', 'BH', 'CA', '90210', '2025-12-01', 'NEW-TRACK', 'Test', '20x25x1')`
    ).run();

    const results = getEligibleTenants(DEFAULT_DATE);

    expect(results).toHaveLength(1);
    expect(results[0].last_filter_size).toBe('20x25x1');
    expect(results[0].last_ship_date).toBe('2025-12-01');
  });

  test('returns no results when no tenants exist', () => {
    const results = getEligibleTenants(DEFAULT_DATE);
    expect(results).toHaveLength(0);
  });

  test('respects asOf boundary — does not consider shipments after asOf date', () => {
    insertTenant(9, 'Iris', 'Sand');
    enrollTenant(9);
    addProperty('prop-1', 90);
    linkTenantProperty(9);
    // Shipment is dated AFTER the asOf — should be ignored, making tenant eligible
    addHistoricalShipment(9, '2026-05-01', 'FUTURE-TRACK');

    const results = getEligibleTenants(DEFAULT_DATE);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(9);
  });

  test('uses the property-level interval to determine window size', () => {
    // 30-day interval property
    insertTenant(10, 'Jake', 'River');
    enrollTenant(10);
    addProperty('prop-fast', 30);
    linkTenantProperty(10, 'prop-fast');
    // Ship date 45 days before asOf — outside 30-day window, so tenant is eligible
    addHistoricalShipment(10, '2026-03-10', 'TRACK-FAST');

    const results = getEligibleTenants(DEFAULT_DATE);

    expect(results.map(r => r.id)).toContain(10);
  });
});
