# Wathiqa Multi-Device — Phase 9 Status

## Phase

Server-Authoritative License

## Status

IMPLEMENTED

## Objective

Ensure the office has one authoritative license state owned by the Wathiqa server. Client installations may validate the office license through the server but cannot activate or mutate the license locally/remotely.

## Implemented

### 1. License activation restricted to the server machine

`POST /api/license/activate` now uses the `localOnly` middleware.

Only requests originating from the server machine loopback interface (`127.0.0.1` / `::1`) can activate the license.

Remote LAN clients receive:

```text
403
SERVER_ONLY_OPERATION
```

### 2. Client startup requires a valid server license

A client installation validates:

```text
Client
  -> Office Server
  -> /api/license/validate
```

If the server reports an invalid/missing license, the client does not open the activation workflow and does not attempt to activate the license itself.

### 3. Server remains authoritative

The license row remains in the server's authoritative SQLite database.

The client does not receive or maintain an independent authoritative license state.

### 4. Existing frontend remains unchanged

No existing Wathiqa frontend source files were modified for this phase.

## Expected behavior

### Main computer

```text
Server
  -> local license validation
  -> local license activation allowed
```

### Client computer

```text
Client
  -> remote license validation allowed
  -> remote license activation rejected
```

## Security notes

The restriction is enforced at the API boundary rather than by relying only on the UI. This prevents a remote client from directly calling the public activation endpoint to mutate the authoritative server license.

## Verification required

A real Windows LAN test is still required to confirm:

1. Server activation succeeds locally.
2. Client validation succeeds against the server.
3. Client activation receives HTTP 403.
4. An invalid server license prevents client startup.
5. A valid server license allows client startup.

This repository environment cannot be used as a substitute for the final two-PC Windows verification.
