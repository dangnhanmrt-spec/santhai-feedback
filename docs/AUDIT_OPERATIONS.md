# SanThai Audit nội bộ

Audit and customer Feedback have separate workspaces, history and permissions. An optional compact overview contains totals only. No evidence attachments, remediation workflow, owner deadlines, or ticket closure are included.

## Metrics

- A manual inspection is one store visit at a recorded Vietnam date/time. Multiple visits per store/day are allowed.
- An inspection with three issues contributes one violating visit and three issues.
- Violation rate = violating manual visits / all completed manual visits. A clean result must be explicitly submitted. Missing records never count as passes.
- Historical exception-only Audit cells are excluded from visit-rate denominators.
- Hygiene pass rate = passed shifts / (passed + failed shifts). Pending, not submitted, unavailable, and conflicting legacy results are excluded.
- Repeat = the same issue type at the same store in at least two distinct inspections in the selected period.

## Access

`feedback_app_members` and `feedback_module_access` are the authoritative application ACL. They are independent of legacy `allowed_emails`, which is shared with other applications. Existing Feedback roles were copied without changes. The designated Audit administrator was promoted in the database; that identity is not published in source.

Audit administrators manage Audit roles only for existing members and add/deactivate issue types. Editors record inspections and hygiene. Viewers read. Only the existing system owner controls Feedback role assignments and system backups. New Audit tables and Feedback-owned data use RLS. Shared Spin/Gantt tables and credentials are not modified.

## Historical import

`scripts/import_audit_history.py` reads the supplied workbook without changing it. It emits a deterministic payload outside the repository. The loader imports in bounded batches using the scoped server credential. It can be resumed because IDs are deterministic and inserts use upserts.

The imported source has 165 Audit inspections, 173 issues and 25,363 hygiene shifts. Six source cells require review. Every nonempty source cell retains its sheet, address, raw value, row-level note and provenance. Archived store labels not present in the current catalog are separate inactive Audit-only identities. Date-like store names, anomalous dates and conflicting outcomes are not silently corrected.

## Backups

Vercel Cron calls `/api/backup-cron` daily at 20:00 UTC (about 03:00 Asia/Ho_Chi_Minh; Hobby scheduling may occur within the hour). It authenticates with `CRON_SECRET`.

`BACKUP_DB_TOKEN` authorizes only a fixed Feedback/Audit snapshot, backup log and data restoration; it cannot execute arbitrary SQL or export Supabase Auth credentials. Only its SHA-256 digest is stored in `feedback_private.backup_config`. `BACKUP_BRIDGE_SECRET` signs receiver requests with HMAC-SHA256, a timestamp and a replay nonce.

The Google Apps Script receiver creates an immutable native Sheet and compressed JSON archive in the configured backup folder. Every table has its own tab, including a `_row_json` column preserving nulls and types. Every row is read back and compared before a run is marked completed. Failures remain visible in the backup run history. Partial files are not treated as completed backups.

Required deployment variables:

- `BACKUP_DB_TOKEN`, `BACKUP_BRIDGE_SECRET`, `CRON_SECRET` (Production secrets)
- `BACKUP_BRIDGE_URL` (published Apps Script `/exec` endpoint)

Before enabling the receiver, the owner must approve its Google Drive and Sheets permissions and deployment. No credentials belong in source, logs or frontend variables. Deployment is incomplete until a real run and readback succeed. The previous ChatGPT backup task should be paused only after its replacement succeeds.

## Restore

Only the system owner can choose a completed backup and explicitly confirm `KHOI PHUC`. The server verifies its checksum and project, and creates a fresh backup before restoration. It upserts the fixed set of data tables in dependency order in one database transaction. Records newer than the backup are not deleted. Shared `stores` / `allowed_emails`, module access grants, credentials and backup run history are deliberately not overwritten. Use the pre-upgrade ZIP's SQL/JSON for a version-1 rollback after reviewing schema compatibility.

## Validation

`npm test` covers visit denominators, multiple issues, historical exclusions, hygiene outcomes, Vietnam date boundaries and backup validation. `npm run build` checks both Feedback and Weather bundles. Database rollback tests cover Audit administrator versus Feedback viewer, denied cross-module escalation, denied viewer writes, and denied unlisted/anonymous reads.

Apply SQL in this order on a new install: `db/audit-v1.sql`, `db/audit-store-sync.sql`, `db/backup-timeouts.sql`, then `db/backup-private-facades.sql`. Privileged backup implementations live in the non-exposed private schema; public RPC facades use SECURITY INVOKER and require the scoped token.

The complete restore path was exercised against the full imported snapshot inside a transaction and rolled back. Original Feedback rows were independently compared to the pre-upgrade snapshot and were unchanged. Google Drive end-to-end verification completed on 2026-10-19 (Vietnam time). Production cron handler created backup `059ecc9f-e766-473e-986c-e3db7c92441a`, verified all 37,821 rows in Google Sheets, and read the compressed archive back through the restore reader with a matching SHA-256 checksum. The interim ChatGPT backup schedule was paused after this successful replacement. Daily platform scheduling remains configured around 03:00 Vietnam time. No backup retention deletion is configured.

## Correcting mistaken Audit records (2026-10-20)

Apply the additive setup SQL `db/audit-delete.sql` after the existing setup scripts. Admin Audit can remove an individual issue or an entire inspection from History or the store/day details. The confirmation names the selected record and allows an optional reason. Removal is soft: original rows and a before-image activity log remain in the database and backups. The app excludes removed inspections/issues everywhere, including compact overview and rate denominators. Removing the last issue also removes its inspection; it never silently creates a clean inspection. A real clean inspection must be explicitly entered separately. Legacy raw provenance remains unchanged.

The public SECURITY INVOKER RPC delegates to a fixed private implementation that checks the current Audit admin role, locks the inspection, and rejects stale issue counts and mismatched child IDs. Clients have no direct UPDATE permission for the affected tables. Editor, viewer and anonymous removal is denied. `tests/sql/audit-delete-rollback.sql` exercises partial/last/full removal, audit logging, blank/null reasons, stale/cross-parent validation and access denial entirely inside a rolled-back transaction; no user data is removed by this test. Unit coverage checks rates/popular/repeat statistics exclude removed data. Production browser visual verification was unavailable in the implementation session; build, database behavior and deployed asset checks are recorded separately.

## Audit action history (2026-10-20)

The Audit admin workspace includes a separate “Nhật ký thao tác” screen, distinct from inspection history. It reads the existing append-only activity records for inspections, violations, hygiene and issue categories, with event-time date filters (Vietnam time), add/delete/update filters, actor search and 50-row pagination. It shows retained deletion snapshots even when an inspection is no longer in active statistics. Older creation logs describe the inspection only; the UI does not infer missing issue details or label an inspection as clean from absent log information. No existing historical log rows are rewritten. Additional per-issue insertion logging is not part of this release. Browser interaction was unavailable in this session; unit/build and released asset verification are separate from live visual verification.

## Bulk entry — 21 October 2026

The previous bulk layouts were rejected by the owner. This implemented candidate is not an accepted design. These notes supersede the old three-screen flow, pagination, full-width-only bulk shell, collapsed row editors and green selection.

### Workflow

- Editors/admins open **Nhập hàng loạt**, then choose inspection or hygiene.
- One setup screen shows all filtered active stores beside common content. Stores are grouped by existing Feedback region colors. There is no pagination, duplicate selected-store list, fixed footer or nested vertical store scroller.
- **Chọn tất cả** and **Bỏ chọn** sit together and apply to the displayed list. **Đã chọn** is the full batch count; the separately labelled list total describes only the current display. Region/search filters retain selection. A warning identifies hidden selections, with actions to inspect the same list or clear all.
- Inspection supports date/time, multiple types/descriptions or explicit no-violation. Hygiene supports any subset of three shifts, result, note and unavailable reason. Blanks never mean pass/no-violation.
- **Lập bảng kiểm tra** creates an editable table. Correct individual times, issues, descriptions, outcomes and notes directly. The header shows all new/update/skipped counts. Display filters never change inclusion.
- Returning to common content on the same date and work type preserves individual exceptions and updates untouched fields. New store/shift rows inherit defaults. Changing date or work type starts fresh row defaults.
- An inspection is a new visit, even for a store already inspected that day. Existing hygiene results start skipped; manual rows require individual opt-in to update, legacy rows stay locked. Skipped rows explicitly say no change. Original update timestamps remain attached across common-content rebuilds, so concurrent changes are not silently accepted.
- Every Audit tab shares one application width, heading scale, navigation and buttons. Selection is blue; pass/fail/pending/unavailable remain distinct business states. Earlier appended bulk CSS layers are replaced by one component section.

### Save protections retained

The existing audit_save_bulk RPC, SQL, permissions and API adapter are unchanged. Each request is atomic (300 rows / 1 MB maximum); invalid rows roll back the batch. Owner-scoped receipts and payload hashes reject changed retries, with locking for concurrent retries. Per-record RLS and action logging remain in place.

The tab keeps the same pending-request key/schema under the signed-in account. A lost response locks editing and permits only retry of the original ID/payload. Reopening Bulk after reload recovers that batch before a new one can start. The success screen starts another batch only by explicit action.

No schema, permission, historical/business data, backup-pipeline or shared CEO/Gantt/Spin changes are required. Retry receipts remain outside business restore. The earlier backup completed at 02:27:51 on 21/10/2026 (Vietnam), run 113df85b-cda4-41d7-bb23-765c45d49073 ([Google Sheets](https://docs.google.com/spreadsheets/d/1_CSP6C184IAIqnIUwUrd8U9YdnOxUegn8VQLdWAMUqI/edit)). This is not a claim about the latest backup; this UI release does not write Production business data.

### Verification and limits

- Signed-in live Feedback reference inspected: dashboard with real warnings, weekly table, entry form/history; the old Audit setup/content/review was inspected too.
- Build and 12 Node tests pass, including exception-preservation and original concurrency-snapshot tests. Existing SQL tests were not rerun against Production for this UI-only change.
- Isolated browser harness (65 sample stores, 17 categories; no Production writes) exercised empty/partial/all/cleared selections, filters and hidden selections, multiple types, individual exceptions and common-content rebuild, all three shifts, manual/legacy defaults, explicit update, required unavailable reason, successful save, and lost-response recovery after reload. The save adapter was simulated; this is not a new real-database save test.
- At the actual 1536 × 904 desktop viewport, all five operational tabs retained the same 1440 px shell and 115 px header without page overflow. Screenshots of selection and editable review were visually assessed. At 390 × 844 the page did not overflow; the review table scrolls horizontally. The viewport was restored.
- Owner acceptance remains pending. Post-deployment checks identify the deployed commit separately from build/local tests.
