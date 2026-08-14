# Wathiqa — Phase 2 Database Audit

## Audit status

**Phase:** 2 — Database/schema audit and migration planning
**Repository:** `MaRtiNMaGed1282/wathiqa`
**Branch:** `phase-1-baseline`

The frozen Master Execution Plan requires the SQLite database to be inspected before migration work. The repository does not contain the actual `database/wathiqa.db` because `*.db` is ignored, and `database/schema.sql` is empty. Therefore this document distinguishes **verified repository-defined schema** from **runtime schema that still requires the actual DB file**.

## 1. Frozen database requirements

The frozen plan requires mapping at minimum:

- users
- clients
- cases
- hearings
- services
- payments
- expenses
- files
- activity
- notifications
- office
- license
- legal library

The user model must support:

- `id`
- `full_name`
- `username`
- `email`
- `password_hash`
- `role`
- `last_login`
- `is_active`
- `must_change_password`

`password_hash` must never be exposed by API responses.

Service files require a dedicated service-file relationship if the current DB does not already provide one.

## 2. Schema source status

### `database/schema.sql`

**Status: EMPTY.** The tracked file contains zero SQL statements. The repository therefore has no canonical declarative schema at present.

### `database/wathiqa.db`

**Status: NOT AVAILABLE IN REPOSITORY.** The root `.gitignore` ignores `*.db`. The actual runtime database must be inspected from the user's local project before any destructive migration is written.

## 3. Schema inferred from repository code

### `users`

The repository references at least these columns:

- `id`
- `full_name`
- `email`
- `password_hash`
- `role`
- `must_change_password`

The frozen plan additionally requires:

- `username`
- `last_login`
- `is_active`

**Verification required:** exact types, defaults, uniqueness, nullability, indexes, and whether the additional frozen fields already exist.

### `clients`

The repository creation script defines:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `full_name TEXT NOT NULL`
- `national_id TEXT NOT NULL UNIQUE`
- `phone TEXT NOT NULL`
- `address TEXT NOT NULL`
- `notes TEXT`
- `created_at DATETIME DEFAULT CURRENT_TIMESTAMP`

Source: `backend/scripts/create-clients-table.js`.

### `legal_cases`

The repository creation script defines:

- `case_id INTEGER PRIMARY KEY AUTOINCREMENT`
- `court_case_number TEXT`
- `client_id INTEGER NOT NULL`
- `case_title TEXT NOT NULL`
- `case_type TEXT`
- `court_name TEXT`
- `court_chamber TEXT`
- `opponent_name TEXT`
- `opponent_lawyer TEXT`
- `opened_at TEXT NOT NULL`
- `closed_at TEXT`
- `case_status TEXT`
- `priority_level TEXT`
- `case_description TEXT`
- `final_result TEXT`
- `total_fees REAL DEFAULT 0`
- `created_at DATETIME DEFAULT CURRENT_TIMESTAMP`
- `updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`

**Important:** the script does not define a foreign-key constraint for `client_id`. Actual DB foreign keys must be verified before changing anything.

### `hearings`

The repository creation script defines:

- `hearing_id INTEGER PRIMARY KEY AUTOINCREMENT`
- `case_id INTEGER NOT NULL`
- `hearing_date TEXT NOT NULL`
- `hearing_time TEXT`
- `hearing_type TEXT`
- `judge_name TEXT`
- `courtroom TEXT`
- `hearing_result TEXT`
- `notes TEXT`
- `next_hearing_date TEXT`
- `postponement_reason TEXT`
- `created_at DATETIME DEFAULT CURRENT_TIMESTAMP`

This matches the frozen decision that hearing result is free text and next-hearing/postponement information is not dependent on a special result selection.

### `payments`

The repository creation script defines:

- `payment_id INTEGER PRIMARY KEY AUTOINCREMENT`
- `case_id INTEGER NOT NULL`
- `amount REAL NOT NULL`
- `payment_date TEXT NOT NULL`
- `payment_method TEXT`
- `notes TEXT`
- `created_at DATETIME DEFAULT CURRENT_TIMESTAMP`

**Architecture issue:** the frozen architecture requires both case and service financial transactions. This table is case-specific. Service payments are referenced by backend code and therefore require a separate `service_payments` table or another verified relationship in the actual DB.

### `case_expenses`

Backend code proves the table exists or is expected to exist with at least:

- `expense_id`
- `case_id`
- `expense_type`
- `amount`
- `expense_date`
- `notes`

Exact constraints and timestamps require DB inspection.

### `service_expenses`

Backend code proves the table exists or is expected to exist with at least:

- `expense_id`
- `service_id`
- `expense_type`
- `amount`
- `expense_date`
- `notes`

Exact constraints and timestamps require DB inspection.

### `legal_services`

Backend code proves the table exists or is expected to exist with at least:

- `service_id`
- `client_id`
- `service_number`
- `service_type`
- `service_title`
- `description`
- `service_status`
- `total_fees`
- `start_date`
- `due_date`
- `completed_date`
- `assigned_to`
- `notes`
- `priority_level`
- `created_at`

The controller generates service numbers as `SRV-#####`.

**Verification required:** exact schema, unique constraint on `service_number`, foreign key on `client_id`, and meaning/type of `assigned_to`.

### `case_files`

Backend code proves the table is expected to contain at least:

- `file_id`
- `case_id`
- `file_name`
- `original_name`
- `file_path`
- `uploaded_at`

The frozen architecture additionally requires robust file metadata and security handling. Exact existing columns must be inspected before adding anything.

### `activity_logs`

The activity logger inserts:

- `module`
- `record_id`
- `action`
- `description`
- `user_id`

The frozen plan additionally requires retaining user, action, module, related record, timestamp, and useful metadata. Exact table definition and whether a timestamp/metadata column exists must be verified.

### `notifications`

`backend/src/config/sqlite.js` creates this table if absent:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `title TEXT NOT NULL`
- `message TEXT NOT NULL`
- `type TEXT NOT NULL`
- `module TEXT`
- `record_id INTEGER`
- `user_id INTEGER`
- `is_read INTEGER DEFAULT 0`
- `created_at DATETIME DEFAULT CURRENT_TIMESTAMP`

The frozen role model requires users to see their own notifications.

### `laws`

The legal library controller queries:

- `id`
- `title`
- other columns through `SELECT *`

The exact `laws` schema is not reliably established by the current repository because `backend/scripts/create-laws-table.js` is misnamed/misimplemented: it queries `legal_templates` rather than creating the laws table.

**Required:** inspect the actual database before creating or changing the legal-library schema.

### `office`

Office routes/controllers exist, but the exact table definition has not been established from a canonical schema file. The frozen plan requires office identity, logo, stamp, and data availability for PDFs.

**Required:** inspect actual DB and controller queries before migration.

### `license`

License functionality exists, but the exact persistent schema is not established from `schema.sql`. The runtime DB and license controller must be inspected before migration.

## 4. Service-file gap

The frozen plan explicitly requires service attachments/files. The current repository audit identified a complete case-file subsystem but no confirmed service-file subsystem equivalent.

This must not be solved by guessing a schema.

Phase 2 migration decision:

**Do not create the service-file table until the actual DB has been inspected.** If absent, create it through a migration with:

- primary key
- `service_id`
- original filename
- stored filename/path
- MIME type
- file size
- upload timestamp
- uploader where supported
- foreign key
- indexes

## 5. Relationship map inferred from code

```text
users
  │
  ├── activity_logs.user_id
  └── notifications.user_id

clients
  ├── legal_cases.client_id
  └── legal_services.client_id

legal_cases
  ├── hearings.case_id
  ├── payments.case_id
  ├── case_expenses.case_id
  └── case_files.case_id

legal_services
  └── service_expenses.service_id
```

A separate service-payment relationship is required by the frozen financial architecture and must be verified in the actual DB/backend.

## 6. Migration blockers

The following are deliberately **not** being changed yet:

1. No migration SQL has been generated.
2. No table has been dropped.
3. No column has been renamed.
4. No foreign key has been added.
5. No data has been transformed.
6. No new service-file table has been created.

Reason: the actual `wathiqa.db` is not present in the repository/runtime available to this audit. Guessing its current state would violate the frozen rule to preserve existing data and not silently change business rules.

## 7. Required local inspection command set

Run from the Wathiqa project root against the real local database:

```bash
sqlite3 database/wathiqa.db ".tables"
sqlite3 database/wathiqa.db ".schema users"
sqlite3 database/wathiqa.db ".schema clients"
sqlite3 database/wathiqa.db ".schema legal_cases"
sqlite3 database/wathiqa.db ".schema hearings"
sqlite3 database/wathiqa.db ".schema legal_services"
sqlite3 database/wathiqa.db ".schema payments"
sqlite3 database/wathiqa.db ".schema case_expenses"
sqlite3 database/wathiqa.db ".schema service_expenses"
sqlite3 database/wathiqa.db ".schema case_files"
sqlite3 database/wathiqa.db ".schema activity_logs"
sqlite3 database/wathiqa.db ".schema notifications"
sqlite3 database/wathiqa.db ".schema laws"
sqlite3 database/wathiqa.db ".schema office"
sqlite3 database/wathiqa.db ".schema license"
```

If the `sqlite3` CLI is not installed, the same inspection should be performed with Node's `sqlite3` package from the project runtime.

## 8. Phase 2 decision

**Phase 2 is audited to the maximum supported by the repository. It is not fully verified until the actual local `database/wathiqa.db` is inspected.**

The next implementation step is therefore a **read-only local DB inspection**, followed by a schema mapping and migration plan based on the actual tables—not a guessed schema.

## 9. Frozen security implications

The database audit must preserve the following frozen requirements:

- Assistant has zero financial visibility where restricted.
- Password hashes are never exposed.
- Destructive operations require server-side authorization.
- Important mutations are logged in Activity.
- Existing data is preserved unless it directly conflicts with frozen architecture/security.
- No cancelled Template/Document system is reintroduced.
