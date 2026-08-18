# Wathiqa Multi-Device Phase 10 — Secrets & Security

## Status

Implementation complete at repository level. Physical Windows packaging/security verification remains required.

## Implemented

- Removed `.env` from the production Electron `extraResources` list.
- Added `electron/server-secrets.js` for server-only secret persistence.
- Server secrets are generated with cryptographically secure random values when no legacy secrets are available.
- Existing legacy `.env` secrets are migrated into `server-secrets.json` when a legacy environment file is still present during server startup.
- Packaged server startup initializes secrets before requiring the backend.
- Backend environment loading can consume `WATHIQA_SERVER_SECRETS_FILE` or the packaged application's server-only `userData/server-secrets.json`.
- Client mode never starts the backend, so it does not need or load server signing secrets.
- Server secrets are stored outside the packaged application resources.
- Secret file writes use restrictive file permissions where supported by the operating system.
- The Office Setup package does not include `.env` or server secrets.

## Secret boundary

### Server

Owns:

- `JWT_SECRET`
- `LICENSE_SECRET`
- SQLite database
- Centralized files
- License state

Stored at runtime under the Wathiqa user-data directory as:

`server-secrets.json`

### Client

Receives only:

- Deployment mode
- Server URL
- Server identity
- Port/connection configuration

It must not receive:

- JWT signing secret
- License signing secret
- Database credentials
- Private signing material

## Compatibility note

A legacy installation can migrate the old `.env` values if the legacy file is still available during the first server startup after this change. Fresh installations generate new server secrets. Existing licenses must therefore be validated during the Windows upgrade test; if a legacy installed package no longer contains its old `.env`, a controlled license migration/re-activation procedure is required before release.

## Frontend restriction

No existing Wathiqa business frontend files were modified for Phase 10.

## Required verification

1. Build the production Wathiqa package.
2. Inspect packaged resources and verify no `.env` is present.
3. Install as server.
4. Confirm `server-secrets.json` is created in user data.
5. Confirm the client package does not contain the secrets file.
6. Confirm client mode starts without backend secrets.
7. Confirm server mode starts with generated/migrated secrets.
8. Verify an existing licensed installation before/after upgrade.
9. Verify JWT authentication from a client machine.
10. Verify license validation from a client machine.
