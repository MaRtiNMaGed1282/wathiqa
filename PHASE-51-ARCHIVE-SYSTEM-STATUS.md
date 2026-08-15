# Phase 51 — Archive System

## Status
Implemented and integrated into active views.

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
- Active Clients/Cases/Services GET responses now exclude actively archived records.
- Individual archived Client/Case/Service GET requests return 404.
- Global Search excludes archived Clients/Cases/Services.
- Dashboard client/case counts, recent records, case distribution, deadlines, and financial aggregates exclude archived records where applicable.
- Restoring a record removes its active archive state, making it visible to normal active views again.

## Implementation approach
The archive layer remains separate from the source tables. A response-level integration middleware applies the archive state to existing GET endpoints and Dashboard output, avoiding destructive schema changes and avoiding duplicated record tables.

## Testing
Not performed. Full project testing remains deferred until all planned feature additions are complete.
