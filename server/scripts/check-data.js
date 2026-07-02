const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../database.db'));

console.log("=== ENROLLMENT RIDER TEXT VARIATIONS ===");
try {
  const riders = db.prepare(`
    SELECT riders, COUNT(*) as count 
    FROM enrollments 
    WHERE product = 'Renters Kit' 
    GROUP BY riders
  `).all();
  console.table(riders);
} catch (e) { console.error("Error reading enrollments:", e.message); }

console.log("\n=== HISTORICAL SHIPMENT RECORDS ===");
try {
  const sampleShipments = db.prepare(`
    SELECT id, tenant_id, recipient_name, tracking_number 
    FROM historical_shipments 
    LIMIT 5
  `).all();
  console.table(sampleShipments);
} catch (e) { console.error("Error reading history:", e.message); }