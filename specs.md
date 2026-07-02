# Air Filter Shipment System — Spec

## Overview

Shipment management system for shipping air filters to eligible tenants. The system handles the full lifecycle of air filter shipments: determining eligibility, exporting shipment orders to a shipping partner, and importing tracking data back from that partner.

Pay close attention to the decisions you make where the requirements run out and real, messy operational data takes over. We do expect clean, readable code, reasonable technical decisions, and some explanation of the tradeoffs you made along the way.

A minimal but correct path through all requirements beats a partial deep dive on one. Edge-case handling is where stronger submissions separate, but this is not about whether you find every single one — we are testing the judgment you apply once you do. Surface what you found and why you handled it the way you did.

---

## Getting Started

A SQLite database (`database.db`), a property configuration file (`properties.json`), and a ShipStation export (`shipstation-export.csv`) are provided in the repository — do not need to create or seed any data.

**Provided data:**

- `database.db` — contains `tenants`, `enrollments`, and `historical_shipments` tables with realistic data already loaded.
- `properties.json` — contains property shipment intervals and tenant/property assignments.
- `shipstation-export.csv` — a ShipStation shipment export to be used for the import requirement (see Requirement 4 below).

The supplemental fixture data is also captured in `fixtures/supplemental-fixtures.sql`. If you need to re-apply those fixtures, run `npm run seed-fixtures`.

The fixture data is intentionally a little messy in the way operational data often is. Some records will not line up cleanly, and the requirements will not tell you what to do with every one. Where the spec runs out, use reasonable defaults, avoid guessing when confidence is low, and document the assumptions behind your decisions.

The `scripts/` directory contains a couple of rough utilities from an earlier prototype. You may use, modify, or replace them.

---

## The Domain

The company manages **Properties** (rental buildings or units), **Tenants** (individuals who live at a property), and **Enrollments** (insurance products held by a tenant).

- A **Tenant** belongs to a **Property** and may have multiple **Enrollments**.
- An **Enrollment** has a coverage type and a `riders` field (a list of add-on products). In the provided data, the coverage type is stored in the `product` column.
- A Tenant is eligible to receive an air filter if they have at least one active Enrollment where:
  - coverage type / `product` is `"Renters Kit"`, **and**
  - `riders` contains an air-filter delivery rider. The fixture data includes rider labels such as `"Free Airfilters Delivery"` and `"Airfilters Delivery ($4)"`; document how you normalize these labels.

---

## Requirements

### 1. Data Model

Extend the provided schema to support the full system. You will need to add tables for at minimum:

- **Property** — a building or address where tenants live. Properties have a configurable shipment interval (in days) that controls how frequently tenants at that property are eligible to receive a new filter.
- **Shipment** — a record of a filter being shipped to a Tenant, including at minimum a shipment date and a tracking number.

The `tenants`, `enrollments`, and `historical_shipments` tables are already present in `database.db` — do not drop or re-seed them. You may use `historical_shipments` directly or normalize it into your own shipment model if that better fits your design.

Use `properties.json` as the source of property shipment intervals. Choose a reasonable fallback approach for property data that cannot be applied cleanly, and explain it in decisions.

---

## 2: Eligibility Engine & Shipment Export

Implement logic to determine which tenants are eligible to receive a shipment as of `2026-04-24`. A tenant is eligible if:

1. They have at least one **active** Enrollment with coverage type / `product = "Renters Kit"` and an air-filter delivery rider in their riders list.
2. They have **not** received a shipment within the number of days defined by their Property's shipment interval. Tenants who have never received a shipment are eligible.
3. If a record exists with a ship_date $\le$ 2026-04-24, it counts as a shipment. Future-dated shipments are ignored (treated as pending/unconfirmed), and shipments exported but lacking tracking are treated as ordered but not yet "received."
4. It prevents double-shipping. If Doug accidentally runs the export twice on the same day, the first run creates a shipment record, which instantly disqualifies the tenant on the second run.

Treat `2026-04-24` as "today." Decide for yourself what counts as having "received a shipment" — for example, whether an order dated in the future or a shipment that was exported but never confirmed should count — and state your choice.

Expose this logic through whatever interface makes sense for your implementation

---

### 3. Shipment Export

Provide a way to generate the batch of eligible tenants to be sent to the shipping partner's API endpoint, which accepts the following columns:

| Column           | Notes                        |
| ---------------- | ---------------------------- |
| `name`           | Recipient full name          |
| `address1`       | Street address               |
| `address2`       | Unit / suite — empty if none |
| `city`           |                              |
| `state`          | Two-letter code              |
| `zip`            |                              |
| `custom_field_1` | Filter size(s) to ship       |

Filter size(s) come from each tenant's past shipments but may lack the structure that a real API would require.

When a shipment batch is exported, record the export so that those tenants are not immediately re-exported in the next batch. Think carefully about what "recording an export" means for eligibility — a shipment has been _ordered_, but not necessarily _delivered_ or _confirmed_. Assume this runs on a schedule: consider what happens on the second run. Describe your approach in your write-up.

---

### 4. Shipment Import

A ShipStation export (`shipstation-export.csv`) is provided in the repository. It contains:

- Recipient name
- Recipient address
- Shipment date
- Tracking number
- One or more filter sizes in `custom_field_1`

Build an import mechanism that ingests this file and matches each row to a Tenant record in your database.

**Matching rules:**

- Attempt to match automatically using the recipient's name, address, or a combination of both. You decide what constitutes a confident automatic match — document your decision.
- Rows that cannot be matched automatically with confidence should be flagged for manual review (see Requirement 5).

**Filter sizes:**

Each shipment row may include one or more filter sizes in `custom_field_1`. Parse and store these sizes. If size data cannot be used, capture enough information for follow-up without blocking the rest of the shipment import.

---

### 5. Manual Review

Unmatched import rows are one source of work that needs a person, but they are not the only one — other parts of the system can surface cases that warrant a closer look too. Build the operator surface where that work gets done. What belongs in front of a person, and what the system resolves on its own, is yours to decide and explain.

Picture Doug, an ops coordinator: he opens this with no engineer nearby and needs to clear what is waiting on his own. Design the screen he needs to act with confidence. Visual polish is not graded; whether Doug can actually do his job is.

---

## Deliverables

1. **Working code** in a version-controlled repository.
2. A **README** that includes:
   - How to set up and run the project locally
   - An **assumptions & edge-case log** — the situations where the spec ran out or the data did not line up, the call you made on each, and why. We weight this as heavily as the code.
   - Tradeoffs you made and why
   - What you would improve or do differently with more time

---

## What We're Looking For

- **Correctness** — does the system behave as specified?
- **Code clarity** — is the code readable and organized?
- **Judgment** — did you make reasonable decisions in ambiguous areas and explain them?
- **Completeness** — are all five requirements represented, even if some are minimal?
- **Operator experience** — could a non-technical ops user run this day-to-day without an engineer or database access?

Most important - does interface lets a real operator do the job. A simple, well-reasoned implementation beats a complex one that's hard to follow.
