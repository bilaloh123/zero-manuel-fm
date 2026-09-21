# AGRIMAX — Backup & Recovery Strategy

Documentation only — no code or database change is implied by this file. It describes what Supabase already does for this project, what still needs manual verification/configuration in the Supabase dashboard, which tables would be catastrophic to lose, how to recover from the failure modes that matter, and the rollback discipline this project has followed for every schema change so far.

Supabase project ref: `yeiufsutwhffxqzewhyj`. Repo: `zero-manuel-fm`, branch `agrimax-rebuild`.

---

## 1. Database backups (Supabase-managed)

Supabase backs up the Postgres database automatically, but **exactly what you get depends on the project's plan**, and that has not been verified for this project as part of writing this document. Treat the table below as "what Supabase generally offers per tier," not as a confirmed fact about this specific project.

| Plan | Automated backups | Point-in-Time Recovery (PITR) |
|---|---|---|
| Free | None — you are on your own (manual `pg_dump` only) | Not available |
| Pro | Daily backups, short retention, restorable from the dashboard | Available as a paid add-on |
| Team | Daily backups, longer retention | Available as a paid add-on |
| Enterprise | Custom | Available, often included |

**Action items — verify manually in the Supabase dashboard (Project Settings → Database → Backups) before trusting any of this:**
- [ ] Confirm the current plan tier.
- [ ] Confirm whether daily backups are actually running (the dashboard shows a backup list with dates).
- [ ] Confirm the retention window (how many days of backups are kept before they roll off).
- [ ] Confirm whether **PITR is enabled**. If it is available on the plan but not turned on, turn it on — for an ERP handling sales, invoices, and stock movements, PITR (recovery to any point in time, not just the last daily snapshot) is the difference between losing a few minutes of data and losing up to a full day.
- [ ] If PITR is enabled, note the retention window (e.g. 7 vs 14 vs 28 days) — that's the maximum age of a mistake you can undo.

None of the above requires touching this repo or its SQL — it's a dashboard/billing configuration task.

## 2. Storage backups — the gap Supabase does NOT cover automatically

**Supabase's automated database backups back up Postgres. They do not back up Supabase Storage objects.** This project has exactly one bucket:

- `documents` — every file uploaded via `DocumentsModal` (`src/lib/documentStorage.js`). Path convention: `{table}/{record_id}/{timestamp}-{filename}`. Used across Harvest Sessions, Stock Movements, Transfers, Quality Checks, Transport Missions, and Maintenance Records — quality-check photos, delivery/reception proof, maintenance evidence, transfer paperwork (including PDFs for transfers).

If this bucket is lost (accidental bulk delete, storage-level incident), a database restore alone will **not** bring the files back — the DB rows referencing them (`harvest_sessions.photos`, `quality_checks.photos`, `transfers.photos`, `transport_missions.photos`, `maintenance_records.photos`, `stock_movements.photo_url`) would just point at paths that no longer resolve.

**Action items:**
- [ ] Decide whether the `documents` bucket needs its own backup (e.g. a scheduled job — Edge Function or external cron — that syncs the bucket to a second location such as S3/Backblaze). This project currently has no such job.
- [ ] At minimum, confirm bucket-level deletion protection / versioning options available on the current Supabase plan, and enable what's available.
- [ ] Until an automated bucket backup exists, treat "we lost the documents bucket" as a real, currently-uncovered risk — not a false alarm.

## 3. Critical tables — what catastrophic loss actually means here

77 real tables exist in the schema (2 more, `stock_balances` and `stock_available_to_promise`, are views — they recompute automatically from base tables and never need their own backup). Not all 77 carry the same risk. Grouped by what losing them would actually cost:

### Tier 1 — financial & legal record (statutory/audit exposure, cannot be recreated from memory)
`sales`, `customer_invoices`, `customer_invoice_items`, `customer_payments`, `credit_notes`, `invoices`, `purchase_orders`, `purchase_order_lines`, `payments`, `expenses`, `budgets`, `payroll_periods`, `payroll_lines`, `audit_log`.

Losing any of these is a legal/financial incident, not just an inconvenience — invoices and payments are the paper trail a tax authority or auditor can ask for, and `audit_log` is itself the record of who-did-what that everything else depends on for trust.

### Tier 2 — operational ledgers (append-only, physically impossible to reconstruct after the fact)
`stock_movements`, `transfers`, `pallet_movements`, `deliveries`, `delivery_items`, `receptions`, `traceability_events`, `weighing_tickets`, `approval_requests`, `approval_decisions`.

These record physical events (a truck left, a pallet moved, a delivery was confirmed, an approval was granted). Unlike a farm's name or a product's price, there is no "just re-enter it" — nobody remembers the exact quantity and timestamp of a stock movement from three weeks ago. `period_locks` also belongs here: it's the record of which periods are closed to further edits, and losing it silently reopens closed accounting periods.

### Tier 3 — reference & configuration (slow-changing, recoverable by re-entry but painful)
`farms`, `sites`, `parcels`, `legal_companies`, `groups`, `seasons`, `crops`, `varieties`, `crop_cycles`, `products`, `warehouses`, `suppliers`, `customers`, `employees`, `vehicles`, `drivers`, `equipment`, `teams`, `roles`, `role_permissions`, `permissions`, `user_farm_access`, `app_users`, `approval_rules`, `approval_steps`, `integrations`.

Losing these breaks the app immediately (nothing works without farms/roles/users) but the data itself could, in principle, be re-entered from paper records or memory — slow and painful, not legally exposed.

### Tier 4 — traceability/quality detail (regulatory relevance for export)
`lots`, `quality_checks`, `harvest_sessions`, `pallets`, `pallet_items`, `packing_runs`, `packing_run_inputs`, `packing_run_outputs`, `harvest_plans`, `product_thresholds`, `stock_ownership`, `stock_reservations`, `supplier_products`.

For an agri-export operation, lot/quality traceability can matter for certification and customer claims, even though it isn't strictly financial.

Everything not listed above (`alerts`, `integration_events`, `quotes`, `quote_items`, `sales_orders`, `sales_order_items`, `purchase_requests`, `attendance`, `maintenance_records`, `fuel_logs`, `cold_storage_units`, `transport_missions`) is operationally useful but lower-stakes if a recent daily backup is restored — a day of quotes or attendance logs is recoverable pain, not a legal problem.

**The practical conclusion:** PITR (section 1) matters most for Tier 1 and Tier 2 — a nightly backup only protects you up to last midnight, and for an append-only ledger like `stock_movements` or an approval trail, losing "today so far" on the day of an incident is exactly the scenario PITR exists for.

## 4. Recovery procedures

### 4.1 Full database restore (disaster scenario)
1. In the Supabase dashboard, go to Database → Backups.
2. Pick either a daily backup or, if PITR is enabled, a specific timestamp just before the incident.
3. Supabase restores into a **new** project (it does not overwrite the live one in place) — this is intentional and safe: it gives a chance to verify the restored data before cutting traffic over.
4. Verify Tier 1/Tier 2 tables specifically (row counts, most recent rows by `created_at`/`occurred_at`) before repointing the app's `VITE_SUPABASE_URL`/keys at the restored project.
5. Re-upload/re-point the `documents` Storage bucket separately (see 4.3) — a DB restore does not bring Storage objects with it.

### 4.2 Single-table or single-row recovery (accidental delete/bad update, not a full disaster)
- If PITR is enabled: Supabase can restore to a point-in-time into a new project, then the specific rows can be copied back into production via `INSERT ... SELECT` against a `postgres_fdw`/`dblink` connection to the restored project, or exported as CSV and re-imported. This is the realistic day-to-day recovery path — full-project restores are for actual disasters, not for "someone deleted 3 rows."
- Without PITR: the most recent daily backup is the only fallback, and anything written after that backup and before the mistake is unrecoverable from Supabase's side. This is the concrete cost of not having PITR on Tier 1/Tier 2 tables.
- `audit_log` (`table_name`, `record_id`, `old_value`, `new_value`, `action`, `occurred_at`) should be checked first in this scenario — if the delete/update was captured there, the `old_value` may be enough to manually reconstruct the row without touching backups at all.

### 4.3 Storage object recovery
- There is currently no automated backup for the `documents` bucket (section 2). Recovery today means: whatever copy exists on the device that originally uploaded the photo/PDF (if any), or accepting the loss.
- This is the strongest concrete argument in this document for actually building the bucket-sync job noted in section 2's action items, rather than treating it as optional.

## 5. Migration & rollback strategy

This project has never used a formal migration tool (no `supabase/migrations`, no Prisma/Drizzle). Every schema change so far has gone through the same manual discipline, and that discipline **is** the rollback strategy:

1. **Full SQL is written and reviewed before it ever runs against production.** Every phase in this project presented complete `CREATE TABLE`/`ALTER TABLE`/RLS/trigger/function SQL for approval before it was run in the Supabase SQL Editor — never partial or "run this and see."
2. **Changes are additive by default.** Every schema change to an existing table so far has been a nullable new column or a brand-new table (e.g. `farms.legal_company_id`, `delivery_items.pallet_id`) — never a destructive `ALTER`/`DROP` on a live table. Additive changes have a trivial rollback: drop the new column/table, which cannot break anything that didn't already depend on it.
3. **For any future change that isn't purely additive** (renaming/retyping/dropping a column, changing an enum, tightening a constraint on existing data): write the rollback SQL *alongside* the forward SQL before running either, as a two-step plan —
   - Forward: add the new shape, backfill/migrate data, verify, only then remove the old shape in a *separate*, later step once the app code no longer references it.
   - Rollback: the exact SQL to undo step 1 if verification fails, written and reviewed at the same time as the forward SQL, not improvised after something breaks.
4. **New RLS policies and functions are tested against the real database with real Node scripts and a real authenticated session before being considered done** — this project's standing testing methodology (see project memory) already doubles as a pre-merge safety net: a broken policy or function is caught during that testing pass, before it ever reaches a point where "rollback" would be needed in production.
5. **Test data is always synthetic and cleaned up**, never real rows — so a bad test never corrupts data that would need restoring in the first place.
6. If Supabase branching (a Pro+ feature that gives an isolated preview database per branch) is available on the current plan, prefer testing schema changes there before running them against production, instead of testing directly against production during a low-traffic window. This has not been used in this project so far (see action item below) but is worth adopting once verified available.

**Action items:**
- [ ] Confirm whether Supabase branching is available on the current plan; if yes, start using it for schema changes instead of testing directly against production SQL Editor.
- [ ] Consider keeping a plain changelog (e.g. `docs/migrations/YYYY-MM-DD-description.sql`) of every SQL script actually run against production, for traceability — not required today, but would make "what changed and when" answerable without re-reading conversation history.
