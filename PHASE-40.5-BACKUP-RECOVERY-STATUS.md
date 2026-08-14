# Phase 40.5 — Backup & Recovery

## Status
Implementation complete. Runtime verification is intentionally deferred to the final testing cycle.

## Scope
- Admin-only backup and restore API.
- Portable ZIP backup containing the SQLite database, case/service uploads, attorney files, and metadata.
- Backup list and authenticated download.
- Automatic safety backup before restore.
- Restore is staged and applied safely at application startup after restart.
- Admin-only frontend page at `frontend/pages/backup.html`.
- Admin-only sidebar navigation.

## Recovery Flow
1. Admin selects a backup.
2. Wathiqa creates a safety backup of the current state.
3. The selected backup is validated and staged.
4. Wathiqa requests an application restart.
5. Startup applies the staged database and file restoration before opening SQLite.
6. The pending restore is removed after successful application.

## Testing
Deferred until the final regression/release testing sequence as instructed.
