# Wathiqa Multi-Device — Phase 11 Status

## Status

Implemented at repository level.

## Scope

Phase 11 separates **device identity** from **Wathiqa user identity** and adds a persistent office-device registry on the server.

## Implemented

- Added `office_devices` SQLite table.
- Added persistent device registry service.
- Added secure device token hashing; plaintext device tokens are never stored in SQLite.
- Pairing now registers a client device and returns a device ID/token.
- Client setup persists the device identity locally.
- Client Electron starts a heartbeat every 60 seconds after successful startup.
- Heartbeat updates last-seen time, IP address, platform, version, and online status.
- Added server-local device listing endpoint.
- Added server-local device revocation endpoint.
- Revoked devices cannot update heartbeat.
- Device identity is separate from application users and roles.
- Existing frontend business files were not modified.

## Device API

- `POST /api/system/pair`
- `POST /api/system/devices/heartbeat`
- `GET /api/system/devices` — server-local management endpoint
- `DELETE /api/system/devices/:deviceId` — server-local revocation endpoint

## Security model

- Pairing uses the existing short-lived pairing token.
- A successful pairing creates a unique device identity and random device token.
- Only the SHA-256 hash of the device token is stored in the office database.
- Device management endpoints are restricted to the server machine itself.
- User authentication/authorization remains separate and unchanged.

## Acceptance tests still required

1. Pair PC2 to PC1.
2. Verify PC2 receives a device identity.
3. Start Wathiqa on PC2 and verify heartbeat appears in `GET /api/system/devices` on PC1.
4. Stop PC2 and verify the last-seen timestamp stops advancing.
5. Revoke PC2 on PC1.
6. Verify PC2 heartbeat is rejected after revocation.
7. Re-pair the device and verify a new active device credential can be registered.
8. Verify user roles remain independent of device identity.
9. Verify no existing frontend business files changed.

## Runtime limitation

The repository changes have not been physically validated on two Windows computers in this environment. Windows/LAN acceptance remains required before release.
