# Wathiqa Multi-Device — Phase 12 Status

## Status

**Implementation complete; physical Windows restore acceptance pending.**

## Scope

Phase 12 makes the office server the authoritative backup source. A backup contains:

- `wathiqa.db`
- `uploads/`
- `attorneys/`
- `office-assets/` when present
- safe deployment configuration (`deployment-config.json`)
- backup metadata
- SHA-256 integrity manifest

Server-private secrets are deliberately excluded.

## Backup behavior

`POST /api/backup` remains Admin-only and creates the backup on the server's configured backup root.

The backup is staged first, then archived. A manifest records each staged file's path, size, and SHA-256 checksum.

## Verification behavior

`GET /api/backup/:name/verify` now extracts the archive into a temporary directory and validates:

1. the archive is a valid Wathiqa backup filename;
2. `wathiqa.db` exists;
3. `backup-manifest.json` exists;
4. every manifest entry exists;
5. file sizes match;
6. SHA-256 checksums match;
7. manifest paths cannot escape the extracted backup root.

Verification does not modify live Wathiqa data.

## Restore behavior

Restore first verifies the selected backup. If verification fails, restore is rejected.

Before scheduling a restore, Wathiqa creates a fresh backup of the current server state.

The verified archive is then staged under `pending-restore` and applied during the next backend/database startup. Database, uploads, attorney files, and office assets are restored together.

This preserves the server-authoritative architecture and avoids opening the live SQLite database while the application is running.

## Security boundary

The backup contains safe deployment metadata only. It does not contain:

- JWT signing secrets
- license signing secrets
- private signing material
- server secret files

## Required physical acceptance test

On Windows, using a test copy/environment:

1. Create a test client/case/service record.
2. Upload a case/service file.
3. Add attorney/office assets where applicable.
4. Create a server backup.
5. Verify the backup and confirm a valid checksum result.
6. Modify/delete the test records and files.
7. Schedule restore.
8. Restart Wathiqa.
9. Verify database records.
10. Verify relationships.
11. Verify uploaded files open.
12. Verify attorney/office assets are restored.
13. Verify login and role permissions.
14. Verify reports/PDFs still work.
15. Verify the restore event is recoverable if the restore fails.

The code implementation is complete, but these two-PC/Windows acceptance tests must not be marked PASS until physically executed.
