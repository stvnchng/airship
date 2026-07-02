const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const db = new Database(path.join(__dirname, '../../database.db'));
const propertiesJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../properties.json'), 'utf-8')
);

const insertProperty = db.prepare(`
  INSERT OR IGNORE INTO properties (id, name, address, shipment_interval_days)
  VALUES (?, ?, NULL, ?)
`);

const insertTenantProperty = db.prepare(`
  INSERT OR IGNORE INTO tenant_property (tenant_id, property_id)
  VALUES (?, ?)
`);

const tenantExists = db.prepare(`SELECT 1 FROM tenants WHERE id = ?`);
const propertyExists = db.prepare(`SELECT id, name FROM properties WHERE id = ?`);
const assignedProperty = db.prepare(`SELECT property_id FROM tenant_property WHERE tenant_id = ?`);

let propertiesInserted = 0;
let propertiesSkipped = 0;
let tenantLinksInserted = 0;
let tenantLinksSkipped = 0;

const seed = db.transaction(() => {
  for (const prop of propertiesJson.properties) {
    const existing = propertyExists.get(prop.id);

    if (existing) {
      console.warn(
        `[SKIP] Duplicate property id "${prop.id}": ` +
        `keeping "${existing.name}", skipping "${prop.name}"`
      );
      propertiesSkipped++;
    } else {
      insertProperty.run(prop.id, prop.name, prop.shipment_interval_days);
      propertiesInserted++;
    }

    for (const tenantId of prop.tenant_ids) {
      if (!tenantExists.get(tenantId)) {
        console.warn(
          `[SKIP] Tenant ${tenantId} in property "${prop.id}" does not exist in tenants table`
        );
        tenantLinksSkipped++;
        continue;
      }
      const result = insertTenantProperty.run(tenantId, prop.id);
      if (result.changes > 0) {
        tenantLinksInserted++;
      } else {
        const already = assignedProperty.get(tenantId);
        console.warn(
          `[SKIP] Tenant ${tenantId} already assigned to "${already.property_id}", skipping "${prop.id}"`
        );
        tenantLinksSkipped++;
      }
    }
  }
});

seed();

console.log(`\nProperties seeded:  ${propertiesInserted} inserted, ${propertiesSkipped} skipped`);
console.log(`Tenant links:       ${tenantLinksInserted} inserted, ${tenantLinksSkipped} skipped`);
