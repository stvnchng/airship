# Air Filter Shipment System

## Setup

**Prerequisites:** Node.js, `sqlite3` CLI on PATH.

```bash
npm install
bash reset.sh        # builds DB, seeds fixtures and properties
```

Then in two terminals:

```bash
npm run dev:backend  # Express on :3000
npm run dev:frontend # Vite on :5173 — open http://localhost:5173
```

> `reset.sh` is destructive — it drops and rebuilds `database.db` from scratch. Run it once on first setup or when you need a clean slate.

---

# Assumptions & Decisions Log

## Data Model

### `properties` table
- `id` is `TEXT` because `properties.json` uses slug strings (`"prop-cedar-court"`), not integers.
- `address` is nullable — `properties.json` provides no address field.

### `property_tenants` junction table
The spec implies a tenant belongs to one property, but the fixture data has tenant 135452 in both `prop-oak-terrace` (60-day interval) and `prop-oak-overflow` (120-day interval). A junction table handles this without modifying the immutable `tenants` table.

**Eligibility tie-break:** when a tenant belongs to multiple properties with different intervals, use the longest interval. Safer to under-ship than to over-ship.

### `historical_shipments` extended with `custom_field_1`
Added the column non-destructively via `ALTER TABLE`. Used for filter sizes on both legacy records and ShipStation imports. Kept in this table rather than a separate `filter_sizes` table — the per-shipment granularity is sufficient and the data is sparse/free-form enough that normalization isn't worth it yet.

### `shipments` vs `historical_shipments`
`historical_shipments` holds all external/legacy data (ShipStation imports, prior records). `shipments` records exports this system generates. Keeping them separate makes eligibility queries unambiguous — only `shipments` rows created by this system count toward the double-ship guard.

**Known gap:** `shipments.tracking_number` is `NOT NULL`, but at export time we only have the order — tracking comes back from ShipStation later. This column should be nullable; a `NULL` tracking number means "ordered, not yet confirmed." Flagging here rather than changing it mid-implementation to avoid breaking the import dedup logic that depends on `tracking_number UNIQUE`.

---

## Properties Seeding (`properties.json` → DB)

Seeding is a separate step (`npm run seed-properties`) that runs after fixtures, not baked into the migration. Reason: `prop-maple-loop` references tenants 900001/900002, which only exist after `seed-fixtures` runs.

**`INSERT OR IGNORE`** on both `properties` and `property_tenants` — makes the script idempotent.

### Edge cases in `properties.json`

| Issue | Decision |
|---|---|
| `prop-riverbend` appears twice (90-day "Riverbend" + 45-day "Riverbend Annex") | First-wins on the primary key. Annex skipped. Tenant 145566 stays on the main 90-day interval. |
| `prop-oak-overflow` lists tenant 135452, who is already in `prop-oak-terrace` | Both links kept. Eligibility uses longest interval (120 days). |
| Tenant IDs not present in `tenants` table | Skipped with a warning. Only affects `prop-maple-loop` if fixtures haven't run. |
| 36 tenants in the DB have no property assignment | They are excluded from shipment eligibility — no property means no interval to evaluate against. |

---

## npm Dependencies

### Runtime (`dependencies`)

| Package | Why |
|---|---|
| `better-sqlite3` | Synchronous SQLite driver. Chosen over `sqlite3` (async) because Express route handlers are synchronous and `better-sqlite3` is the standard choice for single-process Node servers where connection-per-process is fine. |
| `csv-parse` | Parses ShipStation CSV uploads in `importService.js`. Used via the `sync` entrypoint to keep import logic simple. |
| `express` | HTTP server and routing. |
| `multer` | Multipart form handling for CSV file uploads. Required because `express.json()` doesn't handle `multipart/form-data`. |
| `react` / `react-dom` | Frontend UI framework. |
| `sonner` | Toast notifications. Added to replace a custom hand-rolled toast — handles positioning, stacking, dismiss, and rich colors out of the box. |

### Dev (`devDependencies`)

| Package | Why |
|---|---|
| `@vitejs/plugin-react` | Enables JSX transform and React Fast Refresh in Vite. |
| `@types/react` / `@types/react-dom` | TypeScript definitions. No TS in the project, but VS Code uses them for IntelliSense in `.jsx` files even in JS mode. |
| `nodemon` | Restarts the Express server on file changes during development (`npm run dev:backend`). |
| `vite` | Frontend bundler and dev server. |

**Removed:** `serve` (static file server CLI — redundant with `express.static`) and `typescript` (no `.ts` files or `tsconfig.json` in the project).

---

## Data State Note

`schema.sql` contains 1,258 commented-out `INSERT INTO enrollments` rows. These appear to be the original dataset. The current DB has only 2 enrollments (both from `supplemental-fixtures.sql`), meaning nearly all tenants are ineligible under the enrollment check. If `reset.sh` was run against the originally-provided `database.db`, those enrollments were lost. The eligibility engine is implemented against the schema as-is; if the original data is restored, behavior will reflect the full dataset.
