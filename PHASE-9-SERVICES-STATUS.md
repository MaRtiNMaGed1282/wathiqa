# Phase 9 — Services Status

## Scope

Implemented against the frozen Wathiqa Master Implementation Plan.

Reference: Phase 9 — Services.

## Backend

- [x] Service statistics endpoint
- [x] Total services
- [x] Active services
- [x] Completed services
- [x] Overdue services
- [x] Service search endpoint
- [x] Search by service number
- [x] Search by service title
- [x] Search by service type
- [x] Search by client name
- [x] Search by assigned person
- [x] Server-side filters
- [x] Status filter
- [x] Type filter
- [x] Priority filter
- [x] Assigned-person filter
- [x] Start/due-date range filters
- [x] Client existence validation
- [x] Start/due date validation
- [x] Completed-date business rules
- [x] Stable service-number generation
- [x] Activity logging for create/update/delete
- [x] Existing notification behavior preserved
- [x] Admin-only service deletion
- [x] Assistant financial input protection
- [x] Assistant financial response redaction remains enforced by route middleware

## Frontend

- [x] Service statistics cards
- [x] Search UI
- [x] Server-side search
- [x] Status filter
- [x] Type filter
- [x] Priority filter
- [x] Assigned-person filter
- [x] Date-range filters
- [x] Reset filters
- [x] Service table
- [x] Start date
- [x] Due date
- [x] Overdue visual state
- [x] Add-service modal
- [x] Completed-date field behavior
- [x] Assistant financial UI hiding
- [x] Assistant does not submit total_fees
- [x] Client search/selection

## Deferred to later frozen phases

### Phase 10 — Service File System

Multiple service-file upload and the dedicated service-file backend are intentionally deferred to Phase 10, where the frozen plan requires the real service-file subsystem, authenticated open/download, role authorization, validation, storage protection, and activity logging.

### Phase 11 — Service Profile

The existing `service-profile.html` will be aligned with the frozen Service Profile specification in Phase 11, including assistant financial restrictions, payment/expense behavior, service files, activity, PDF, and removal of cancelled template functionality.

## Schema Compatibility

The current `legal_services` schema was checked against the available database. No `updated_at` column exists, so Phase 9 does not introduce writes to that nonexistent field.

## Acceptance

Phase 9 implementation is complete at the Services-list/backend layer. API/UI runtime testing remains required before marking the phase fully accepted.
