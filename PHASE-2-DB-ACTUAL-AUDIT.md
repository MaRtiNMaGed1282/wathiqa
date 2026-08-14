# Wathiqa — Phase 2 Actual SQLite Audit

**Database inspected:** uploaded `wathiqa(1).db`
**Purpose:** Read-only inspection required by Phase 2 of the frozen Master Implementation Plan.
**No database data was modified.**

## 1. Database inventory

The actual database contains 20 tables:

- activity_logs
- case_expenses
- case_files
- case_templates
- client_attorneys
- clients
- hearings
- laws
- legal_cases
- legal_services
- legal_templates
- license
- notifications
- office_settings
- payments
- service_expenses
- service_files
- sqlite_sequence
- test
- users

`schema.sql` in the repository remains empty.

## 2. Record counts

| Table | Rows |
|---|---:|
| users | 2 |
| clients | 2 |
| legal_cases | 2 |
| hearings | 1 |
| legal_services | 1 |
| payments | 2 |
| case_expenses | 1 |
| service_expenses | 2 |
| case_files | 3 |
| service_files | 0 |
| activity_logs | 7 |
| notifications | 0 |
| office_settings | 1 |
| license | 1 |
| laws | 20 |
| client_attorneys | 2 |
| legal_templates | 0 |
| case_templates | 3 |
| test | 1 |

## 3. Users — actual schema

Current columns:

- id
- full_name
- email
- password_hash
- role
- created_at
- must_change_password
- username
- last_login
- is_active

The frozen plan's required user fields are therefore present.

Current data has 2 users: one `admin` and one `lawyer`. Both are active and both currently have `must_change_password = 0`.

The database contains password hashes. They must never be exposed by API responses.

## 4. Clients — actual schema

Columns:

- id
- full_name
- national_id
- phone
- address
- notes
- created_at
- client_code

`national_id` has a UNIQUE auto-index. `client_code` has an index but is not currently unique.

2 client records exist.

## 5. Cases — actual schema

Table: `legal_cases`

Columns:

- case_id
- court_case_number
- client_id
- case_title
- case_type
- court_name
- court_chamber
- opponent_name
- opponent_lawyer
- opened_at
- closed_at
- case_status
- priority_level
- case_description
- final_result
- total_fees
- created_at
- updated_at

2 case records exist.

No foreign key is currently defined from `legal_cases.client_id` to `clients.id`.

## 6. Hearings — actual schema

Columns:

- hearing_id
- case_id
- hearing_date
- hearing_time
- hearing_type
- judge_name
- courtroom
- hearing_result
- notes
- next_hearing_date
- postponement_reason
- created_at

1 hearing exists.

No foreign key is currently defined from `hearings.case_id` to `legal_cases.case_id`.

## 7. Services — actual schema

Table: `legal_services`

Columns:

- service_id
- client_id
- service_number
- service_type
- service_title
- description
- service_status
- total_fees
- start_date
- due_date
- completed_date
- created_at
- assigned_to
- notes
- priority_level
- linked_case_id

There is a foreign key from `client_id` to `clients.id`.

`linked_case_id` currently has no foreign key.

1 service exists.

## 8. Payments — actual schema

Columns:

- payment_id
- case_id
- service_id
- amount
- payment_date
- payment_method
- notes
- created_at

The actual database already supports both case payments and service payments in the same table through nullable `case_id` / `service_id`.

There are 2 payment records:

- one case payment
- one service payment

No foreign keys are currently defined for either payment relationship.

## 9. Expenses — actual schema

### `case_expenses`

Columns:

- expense_id
- case_id
- expense_type
- amount
- expense_date
- notes
- created_at

1 record exists.

No foreign key currently defined for `case_id`.

### `service_expenses`

Columns:

- expense_id
- service_id
- expense_type
- amount
- expense_date
- notes
- created_at

2 records exist.

Foreign key exists from `service_id` to `legal_services.service_id` with `ON DELETE CASCADE`.

## 10. Files — actual schema

### `case_files`

Columns:

- file_id
- case_id
- file_name
- original_name
- file_path
- uploaded_at

3 records exist.

No foreign key currently defined for `case_id`.

One existing record is orphaned: `case_id = 3` does not exist in `legal_cases`.

### `service_files`

Columns:

- file_id
- service_id
- file_name
- original_name
- file_path
- uploaded_at

0 records currently exist.

Foreign key exists from `service_id` to `legal_services.service_id`.

The frozen plan requires additional service-file metadata including MIME type, file size, upload timestamp, uploader where supported, foreign key, and indexes. The current table has only filename/path/timestamp fields.

## 11. Activity

`activity_logs` columns:

- id
- module
- record_id
- action
- description
- user_id
- created_at

7 records exist.

Foreign key exists from `user_id` to `users.id`.

No orphan activity records were found.

## 12. Notifications

Columns:

- id
- title
- message
- type
- module
- record_id
- user_id
- is_read
- created_at

0 records currently exist.

No foreign key is currently defined for `user_id`.

## 13. Office

Table: `office_settings`

Columns:

- id
- office_name
- owner_name
- phone
- secondary_phone
- email
- address
- logo_path
- stamp_path
- tax_number
- commercial_register
- license_number
- created_at

1 record exists.

## 14. License

Table: `license`

Columns:

- id
- office_name
- license_key
- expiry_date
- is_active
- created_at
- payload
- signature

1 record exists.

## 15. Legal library

Table: `laws`

Columns:

- id
- title
- law_number
- category
- description
- pdf_path
- created_at

20 records exist.

The actual database therefore contains a functioning `laws` table despite the repository script named `create-laws-table.js` not actually creating it.

## 16. Cancelled template subsystem — actual DB state

Two tables remain:

### `legal_templates`

0 records.

### `case_templates`

3 records.

The `case_templates` table has foreign keys referencing:

- `legal_templates.id`
- `cases.id`

However, the actual case table is `legal_cases`, not `cases`.

`PRAGMA foreign_key_check` reports violations for all 3 `case_templates` rows. The violations involve both the `legal_templates` relationship and the nonexistent `cases` relationship.

This is a concrete legacy/cancelled subsystem defect and confirms that the template subsystem must be handled during the planned cleanup phase. **No rows were deleted during this audit.**

## 17. `test` table

A table named `test` exists with:

- id
- name

It contains 1 row.

This is not part of the frozen target architecture and is therefore identified as a legacy/test artifact. It must not be deleted until the planned cleanup/dependency verification stage.

## 18. `client_attorneys`

Columns:

- id
- client_id
- attorney_number
- attorney_type
- issue_date
- issuing_office
- file_path
- notes
- created_at

2 records exist.

No foreign key is currently defined for `client_id`.

One existing record is orphaned: `client_id = 97` does not exist in the current `clients` table.

## 19. Foreign-key enforcement

`PRAGMA foreign_keys` is currently `0` in the inspected database connection.

Defined foreign keys exist only on selected tables. There are no triggers and no views in the database.

`PRAGMA foreign_key_check` reports only the existing `case_templates` violations described above.

## 20. Other orphan checks

No orphan records were found for:

- case expenses → legal cases
- hearings → legal cases
- payments → legal cases
- payments → legal services
- service expenses → legal services
- service files → legal services
- activity logs → users
- legal service linked cases

Orphans were found for:

- case_files: 1 record (`case_id = 3`)
- client_attorneys: 1 record (`client_id = 97`)
- case_templates: 3 records with invalid foreign-key relationships

These records must be preserved until the migration/recovery decision is explicitly made according to the frozen rule to preserve existing data unless it conflicts with the frozen architecture or security requirements.

## 21. Schema conflicts requiring explicit migration handling

The actual DB establishes the following concrete issues:

1. `case_templates` is cancelled by the frozen plan but contains 3 records and invalid foreign keys.
2. `legal_templates` is cancelled and empty.
3. `test` is a non-target table with 1 row.
4. `case_files` contains one orphaned file record.
5. `client_attorneys` contains one orphaned client relationship.
6. Many relationships are not enforced by foreign keys.
7. `service_files` exists but lacks the full metadata required by the frozen plan.
8. `payments` already supports both case and service payments, so a separate service-payments table is not required by the actual database structure.
9. Required user fields already exist; no user-column addition is required merely to satisfy the Phase 2 field checklist.

## 22. Migration gate

Phase 2 inspection is now complete against the actual uploaded database.

The next step is the **migration/upgrade script**, but before writing destructive or structural SQL, the migration must be tested against a copy of this database as required by the Master Execution Plan.

No production/current database was modified.
