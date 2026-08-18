# Wathiqa Multi-Device — Phase 1 Repository & Runtime Audit

## Scope

This document records the Phase 1 audit for the multi-device office deployment plan.

**Constraint:** No existing frontend files were modified in Phase 1.

## Current Architecture Findings

### Electron startup

`electron/main.js` currently:

- defines `BACKEND_URL` as `http://localhost:5000`;
- imports and starts `../backend/src/server` directly;
- waits for that local server before opening the application;
- validates the license against the same local backend;
- restricts renderer `connect-src` to `http://localhost:5000`.

This confirms that the current packaged desktop application is fundamentally local-backend oriented.

### Backend startup

`backend/src/server.js` starts the Express application on `process.env.PORT || 5000`.

The backend is therefore suitable for a server-mode deployment, but its network binding/configuration must be made explicit for LAN use in a later phase.

### API base URL

The existing frontend API helper (`frontend/assets/js/api.js`) centralizes URL resolution, but that file is explicitly out of scope for this implementation because the user required **no existing frontend file changes**.

Phase 2 must therefore provide a backend/Electron-side configuration mechanism that works without modifying existing frontend files.

### SQLite

`backend/src/config/sqlite.js` resolves the authoritative database locally.

For packaged Electron builds it stores the writable database under Electron `userData/database/wathiqa.db`, copying the bundled database on first launch.

This is compatible with a server-owned SQLite database, but not with two independent synchronized databases.

### Uploaded files

`backend/src/config/upload.js` stores uploads under the current process's local Electron/user-data storage.

`backend/src/config/attorneyUpload.js` similarly stores attorney files locally.

`backend/src/utils/storagePaths.js` also resolves upload and attorney roots locally.

Therefore, multi-device mode must keep these writes on the authoritative server. Clients must reach file APIs through the server rather than writing local authoritative copies.

### Backup and restore

`backend/src/services/backup.service.js` already backs up:

- `wathiqa.db`;
- case/service uploads;
- attorney files;
- backup metadata.

Backup routes are already protected by authentication and admin authorization in `backend/src/routes/backup.routes.js`.

This infrastructure can remain server-authoritative.

### License

License validation currently occurs during Electron startup against the local backend. Multi-device mode will need server-authoritative license state so that all office clients consume one license state.

### Environment / CORS

`backend/src/config/env.js` already supports:

- `PORT`;
- `CORS_ORIGIN`;
- mandatory `JWT_SECRET`;
- mandatory `LICENSE_SECRET`.

Current default CORS origins are local-development origins only. LAN server mode will require a controlled later-phase configuration.

### Packaging

`package.json` currently packages:

- Electron;
- frontend;
- backend;
- runtime dependencies;
- the `database` directory;
- an external `.env` resource.

The current build is therefore a single desktop package rather than a clean server/client split.

### Existing client-release preparation

`backend/scripts/prepare-client-release.js` currently creates a stripped client database by removing operational data, uploaded files, and most user data while preserving an admin and license placeholder.

This existing script is relevant to later client packaging work, but it does not itself implement client/server connectivity.

## Frontend Change Constraint

The following existing frontend files were inspected and were **not modified**:

- `frontend/assets/js/api.js`
- all existing frontend pages
- all existing frontend assets

Future changes must respect this constraint. New setup/connection behavior should be implemented through new infrastructure files, Electron, backend routes/configuration, or a separate Office Setup application.

## Phase 1 Audit Conclusion

The current repository has a clear path to multi-device support without changing existing frontend files:

```text
                 Office LAN
                     |
              Wathiqa Server
                     |
             Express Backend
                     |
              SQLite + Files
                     ^
                     |
          Wathiqa Client Devices
```

The main local-only assumptions to address in subsequent phases are:

1. Electron always starts the backend locally.
2. Electron always points at `localhost:5000`.
3. SQLite is resolved per installation.
4. File storage is resolved per installation.
5. CORS defaults are local-only.
6. License validation is local-instance oriented.
7. Current packaging does not distinguish server and client deployment.

## Phase 1 Acceptance

Phase 1 is complete when:

- the local-only assumptions are documented;
- affected backend/Electron/infrastructure files are identified;
- the implementation path is established;
- no existing frontend files have been changed.
