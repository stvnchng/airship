-- 1. Extend the pre-existing historical_shipments table with the custom field column
ALTER TABLE historical_shipments ADD COLUMN custom_field_1 TEXT;

-- 2. Corrected Properties Table: Switched ID type to TEXT and made address nullable/optional
CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    shipment_interval_days INTEGER NOT NULL DEFAULT 90
);

-- 3. Property-Tenant Mapping Table: Solves the overlapping tenant data and assignment array
CREATE TABLE IF NOT EXISTS property_tenants (
    property_id TEXT NOT NULL,
    tenant_id INTEGER NOT NULL,
    PRIMARY KEY (property_id, tenant_id),
    FOREIGN KEY (property_id) REFERENCES properties(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- 4. Corrected Shipments Table: Updated property_id to match the TEXT key schema
CREATE TABLE IF NOT EXISTS shipments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    property_id TEXT,
    ship_date TEXT NOT NULL,
    tracking_number TEXT UNIQUE,
    source TEXT DEFAULT 'Manual Engine',
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (property_id) REFERENCES properties(id)
);