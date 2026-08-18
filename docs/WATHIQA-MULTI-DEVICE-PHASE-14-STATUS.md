# Wathiqa Multi-Device — Phase 14 Status

## Status

Implementation complete; physical Windows acceptance remains pending.

## Implemented

- Added `electron/version-compatibility.js` as the single compatibility rule source.
- Server reports its Wathiqa application version through `/api/system/health` and `/api/system/info`.
- Added `GET /api/system/compatibility?clientVersion=...` returning HTTP 200 when compatible and HTTP 409 when incompatible.
- Client startup checks the server-reported version before opening Wathiqa.
- Client/server compatibility currently requires the same semantic-version major number. Patch and minor releases within the same major are accepted.
- Pairing rejects an incompatible client before registering the device.
- Heartbeat records the client version and rejects an incompatible client with HTTP 409.
- Client startup shows a dedicated version-mismatch message instead of opening the application against an incompatible server.
- Existing Wathiqa frontend files were not modified.

## Safety rule

Database migrations remain server-controlled. A client must never silently operate against a server/database contract it does not support.

## Required Windows acceptance tests

1. Server and client on the same version: client starts and pairs.
2. Server patch version differs within the same major: client starts.
3. Server minor version differs within the same major: client starts, subject to the release's migration compatibility policy.
4. Server major version differs: client is blocked before login.
5. Pairing a major-incompatible client: pairing is rejected and no device is registered.
6. Heartbeat from a major-incompatible client: server returns HTTP 409.
7. Upgrade server while clients are offline, then reconnect clients and verify compatibility behavior.
8. Verify no existing frontend files were changed by this phase.
