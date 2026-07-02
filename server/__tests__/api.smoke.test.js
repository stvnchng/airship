'use strict';

/**
 * API smoke tests for the main routes: /api/dashboard, /api/ingest, /api/export
 *
 * Uses supertest against a minimal Express app wired with the same route
 * handlers, but backed by an in-memory SQLite DB so no real database.db is
 * touched.
 *
 * Because the route modules (dashboard.js, export.js) call db.prepare() at
 * module load time we have to install the jest.mock BEFORE requiring any of
 * those modules.
 */

const request = require('supertest');
const express = require('express');

// ----------------------------------------------------------------------------
// Install mock DB before any route modules are required.
// jest.mock() is hoisted, so the factory cannot reference outer variables —
// we load the DB from a shared singleton module instead.
// ----------------------------------------------------------------------------
jest.mock('../db', () => require('./helpers/testDbSingleton'));

const testDb = require('./helpers/testDbSingleton');

// ----------------------------------------------------------------------------
// Build a minimal app with only the routes under test
// ----------------------------------------------------------------------------
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/dashboard', require('../routes/dashboard'));
  app.use('/api/ingest', require('../routes/ingest'));
  app.use('/api/export', require('../routes/export'));
  return app;
}

const app = buildApp();

// ----------------------------------------------------------------------------
// Seed helpers
// ----------------------------------------------------------------------------

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
    `INSERT OR IGNORE INTO tenant_property (tenant_id, property_id) VALUES (?, ?)`
  ).run(tenantId, propertyId);
}

function addUnresolved() {
  testDb.prepare(
    `INSERT INTO historical_shipments
       (tenant_id, recipient_name, address1, city, state, zip, ship_date, tracking_number, source, review_reason)
     VALUES (NULL, 'Unknown Person', '999 Nowhere', 'Anytown', 'CA', '00000', '2026-01-01', 'UNRESOLV-1', 'ShipStation Import', 'unmatched')`
  ).run();
}

// ----------------------------------------------------------------------------
// Cleanup
// ----------------------------------------------------------------------------

afterEach(() => {
  testDb.exec(`
    DELETE FROM shipments;
    DELETE FROM historical_shipments;
    DELETE FROM tenant_property;
    DELETE FROM enrollments;
    DELETE FROM properties;
    DELETE FROM tenants;
  `);
});

// ----------------------------------------------------------------------------
// /api/dashboard
// ----------------------------------------------------------------------------

describe('GET /api/dashboard', () => {
  test('returns 200 with expected shape', async () => {
    const res = await request(app).get('/api/dashboard');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('metrics');
    expect(res.body).toHaveProperty('queue');
    expect(res.body.metrics).toMatchObject({
      eligibleTenants: expect.any(Number),
      awaitingReview: expect.any(Number),
      successfullyMatched: expect.any(Number),
    });
  });

  test('eligibleTenants reflects active enrolled tenants', async () => {
    insertTenant(1, 'Alice', 'Smith');
    enrollTenant(1);
    addProperty('prop-1', 90);
    linkTenantProperty(1);

    const res = await request(app).get('/api/dashboard');

    expect(res.status).toBe(200);
    expect(res.body.metrics.eligibleTenants).toBe(1);
  });

  test('awaitingReview counts unresolved historical_shipments', async () => {
    addUnresolved();

    const res = await request(app).get('/api/dashboard');

    expect(res.status).toBe(200);
    expect(res.body.metrics.awaitingReview).toBe(1);
    expect(res.body.queue).toHaveLength(1);
    expect(res.body.queue[0]).toHaveProperty('name');
    expect(res.body.queue[0]).toHaveProperty('address');
  });

  test('accepts custom asOf query param', async () => {
    const res = await request(app).get('/api/dashboard?asOf=2025-01-01');
    expect(res.status).toBe(200);
  });
});

// ----------------------------------------------------------------------------
// POST /api/ingest
// ----------------------------------------------------------------------------

describe('POST /api/ingest', () => {
  const CSV_HEADER = 'shipment_id,name,address1,address2,city,state,zip,ship_date,custom_field_1';

  function csvBuffer(rows) {
    const lines = rows.map(r => Object.values(r).join(','));
    return Buffer.from([CSV_HEADER, ...lines].join('\n'), 'utf-8');
  }

  test('returns 400 when no file is attached', async () => {
    const res = await request(app).post('/api/ingest');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 200 with summary for a valid CSV upload', async () => {
    const buf = csvBuffer([
      ['TRK-101', 'Test Person', '1 St', '', 'LA', 'CA', '90001', '2026-01-01', '16x20x1'],
    ]);

    const res = await request(app)
      .post('/api/ingest')
      .attach('file', buf, { filename: 'test.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/Processed 1 row/);
  });

  test('reports skipped duplicates on second upload of same file', async () => {
    const buf = csvBuffer([
      ['TRK-DUP2', 'Test Person', '1 St', '', 'LA', 'CA', '90001', '2026-01-01', ''],
    ]);

    await request(app)
      .post('/api/ingest')
      .attach('file', buf, { filename: 'test.csv', contentType: 'text/csv' });

    const res = await request(app)
      .post('/api/ingest')
      .attach('file', buf, { filename: 'test.csv', contentType: 'text/csv' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/1 duplicate/);
  });
});

// ----------------------------------------------------------------------------
// POST /api/export
// ----------------------------------------------------------------------------

describe('POST /api/export', () => {
  test('returns 400 when there are no eligible tenants', async () => {
    const res = await request(app).post('/api/export');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns CSV when eligible tenants exist', async () => {
    insertTenant(10, 'Export', 'Test');
    enrollTenant(10);
    addProperty('prop-1', 90);
    linkTenantProperty(10);

    const res = await request(app).post('/api/export');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    expect(res.text).toMatch(/name,address1/);
    expect(res.text).toMatch(/Export Test/);
  });

  test('inserts rows into shipments table on successful export', async () => {
    insertTenant(11, 'Ship', 'Me');
    enrollTenant(11);
    addProperty('prop-1', 90);
    linkTenantProperty(11);

    await request(app).post('/api/export');

    const row = testDb.prepare('SELECT * FROM shipments WHERE tenant_id = ?').get(11);
    expect(row).not.toBeNull();
    expect(row.source).toBe('FilterFlow Export');
  });

  test('exported tenant is excluded from subsequent export (already in shipments)', async () => {
    insertTenant(12, 'Once', 'Only');
    enrollTenant(12);
    addProperty('prop-1', 90);
    linkTenantProperty(12);

    // First export — should succeed
    const res1 = await request(app).post('/api/export');
    expect(res1.status).toBe(200);

    // Second export — tenant is now in shipments, so no eligible tenants
    const res2 = await request(app).post('/api/export');
    expect(res2.status).toBe(400);
  });

  test('accepts custom asOf query param', async () => {
    const res = await request(app).post('/api/export?asOf=2025-01-01');
    // No tenants eligible for that date — 400 is the correct response
    expect(res.status).toBe(400);
  });
});
