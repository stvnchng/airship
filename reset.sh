#!/bin/bash
echo "🧹 Wiping existing database file..."
rm -f database.db
rm -f server/database.db # Clear out the duplicate server file just in case it's caching!

echo "🏗️  Building tables..."
sqlite3 database.db < schema.sql

echo "🚚 Applying structural migrations..."
sqlite3 database.db < migration.sql

echo "🔥 FORCE PURGING POST-SCHEMA RESIDUALS..."
# This forces historical_shipments to be completely empty before your final mock data hits
sqlite3 database.db "DELETE FROM historical_shipments;"

echo "🌱 Seeding ONLY baseline mock fixtures..."
sqlite3 database.db < fixtures/supplemental-fixtures.sql

echo "🏠 Seeding properties from properties.json..."
node server/scripts/seed-properties.js

echo "👁️  Verification Check:"
echo "Total Shipments remaining in DB: $(sqlite3 database.db "SELECT COUNT(*) FROM historical_shipments;")"
echo "✨ Database successfully restored!"