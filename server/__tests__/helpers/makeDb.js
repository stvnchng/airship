/**
 * Creates a fresh in-memory SQLite database with the full application schema.
 * Call this once per test file (or per test) to get a hermetic DB instance.
 */
const Database = require('better-sqlite3');

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY,
    first_name VARCHAR,
    last_name VARCHAR,
    address1 VARCHAR,
    address2 VARCHAR,
    city VARCHAR,
    state VARCHAR,
    zip VARCHAR
  );

  CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY,
    active BOOL DEFAULT false,
    tenant_id INTEGER,
    product VARCHAR,
    riders VARCHAR
  );

  CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    shipment_interval_days INTEGER NOT NULL DEFAULT 90
  );

  CREATE TABLE IF NOT EXISTS property_tenants (
    property_id TEXT NOT NULL,
    tenant_id INTEGER NOT NULL,
    PRIMARY KEY (property_id, tenant_id)
  );

  CREATE TABLE IF NOT EXISTS historical_shipments (
    id INTEGER PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    recipient_name VARCHAR NOT NULL,
    address1 VARCHAR NOT NULL,
    address2 VARCHAR,
    city VARCHAR NOT NULL,
    state VARCHAR NOT NULL,
    zip VARCHAR NOT NULL,
    ship_date VARCHAR NOT NULL,
    tracking_number VARCHAR NOT NULL UNIQUE,
    source VARCHAR NOT NULL,
    notes VARCHAR,
    custom_field_1 TEXT
  );

  CREATE TABLE IF NOT EXISTS shipments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    property_id TEXT,
    ship_date TEXT NOT NULL,
    tracking_number TEXT UNIQUE,
    source TEXT DEFAULT 'Manual Engine'
  );
`;

function makeDb() {
  const db = new Database(':memory:');
  db.exec(SCHEMA);
  return db;
}

module.exports = { makeDb };
