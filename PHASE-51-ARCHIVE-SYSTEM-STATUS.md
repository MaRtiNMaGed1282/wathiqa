# Phase 51 — Archive System

## Status
Implemented.

## Scope
- Added a persistent `archived_records` table created automatically by the archive service.
- Supported entity types: clients, cases, services.
- Archiving is soft-state: the source record is never deleted.
- Admin-only archive listing, archive action, and restore action.
- Optional archive reason.
- Records who archived/restored the record and timestamps.
- Duplicate active archive protection.
- Activity logging for archive/restore actions.
- Notification generated for archive actions.
- Added Admin-only Archive page and sidebar entry.

## Important implementation boundary
The archive layer is intentionally separate from the source tables to avoid destructive schema changes. Existing active-list/search/dashboard queries were not rewritten in this phase; therefore the next integration pass should make archived records disappear from active views and search by default while preserving explicit access from the Archive page.

## Testing
Not performed. Full project testing remains deferred until all planned feature additions are complete.
