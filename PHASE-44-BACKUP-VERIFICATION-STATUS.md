# Phase 44 — Backup Verification

## Status

Implemented.

## Scope

- Verify backup archive readability before relying on it for recovery.
- Extract the archive into a temporary directory without modifying the live database.
- Confirm that `wathiqa.db` exists.
- Parse `backup-metadata.json` when present.
- Run SQLite `PRAGMA integrity_check` against the extracted database in read-only mode.
- Report included `uploads` and `attorneys` directories.
- Keep verification restricted to authenticated Admin users through the existing backup route guard.
- Add a **التحقق** action to the backup page.

## Existing functionality preserved

- Manual backup creation.
- Backup listing.
- Authenticated backup download.
- Restore scheduling.
- Automatic safety backup before restore.
- Existing Admin-only access.

## Testing

Runtime testing is intentionally deferred until the complete feature set is implemented, according to the project workflow.
