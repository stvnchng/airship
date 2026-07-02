-- 1. Extend the pre-existing historical_shipments table with the custom field column
ALTER TABLE historical_shipments ADD COLUMN custom_field_1 TEXT;

-- 1b. review_reason — null means no action needed; set by import when a row needs a human.
--     Values: 'unmatched', 'ambiguous_match', 'no_filter_size'
--     Cleared to null by resolve/dismiss/size-save actions.
ALTER TABLE historical_shipments ADD COLUMN review_reason TEXT;

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

-- 5. Import log — records when a ShipStation CSV was actually uploaded (not ship dates of records).
--    Used to gate exports on "has a real import happened since the last export."
CREATE TABLE IF NOT EXISTS import_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    imported_at TEXT NOT NULL,
    row_count   INTEGER NOT NULL,
    matched     INTEGER NOT NULL,
    unresolved  INTEGER NOT NULL
);

-- 6. Export batch log — stores the generated CSV so it can be re-downloaded
--    without re-running the export and creating duplicate shipment records.
CREATE TABLE IF NOT EXISTS export_batches (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    exported_at  TEXT NOT NULL,
    as_of        TEXT NOT NULL,
    tenant_count INTEGER NOT NULL,
    csv_content  TEXT NOT NULL
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