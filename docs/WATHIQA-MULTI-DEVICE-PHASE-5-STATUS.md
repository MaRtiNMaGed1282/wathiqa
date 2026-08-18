# Wathiqa Multi-Device — Phase 5 Status

## Phase

Phase 5 — Wathiqa Office Setup Application

## Status

**IMPLEMENTED — WINDOWS PACKAGING AND TWO-PC RUNTIME VERIFICATION STILL REQUIRED**

## Implemented

### 1. Separate Office Setup application

Added a dedicated Electron entry point:

```text
electron/setup-main.js
```

and a dedicated preload bridge:

```text
electron/setup-preload.js
```

The setup utility is isolated from Wathiqa's legal-management business logic.

### 2. First-run deployment workflow

The setup utility provides these choices:

```text
This computer only
Multiple computers in this office
```

For multi-device offices:

```text
Main Server
Connect to Existing Server
```

### 3. Standalone configuration

The utility can save:

```text
mode = standalone
host = 127.0.0.1
```

without modifying frontend source files.

### 4. Server configuration

The utility can save:

```text
mode = server
host = 0.0.0.0
port = 5000
serverIdentity = local hostname
```

It also displays the detected LAN IPv4 address and the address clients should use.

### 5. Client configuration

The utility accepts a manual server URL, tests:

```text
GET /api/system/health
GET /api/system/info
```

and saves:

```text
mode = client
serverUrl = configured office server
serverIdentity = optional server identity
```

The test must succeed before the client configuration is saved.

### 6. Shared deployment configuration

The setup utility deliberately uses the same Wathiqa user-data directory for `deployment.json` as the main Wathiqa application.

This prevents the setup utility from creating an isolated deployment configuration that Wathiqa cannot see.

### 7. Diagnostics

The UI reports:

- Server reachable/unreachable.
- Server identity.
- Server mode.
- Configured address.
- Firewall guidance.
- Invalid address/configuration errors.

Windows Firewall automation is explicitly deferred to Phase 7.

### 8. Safe Wathiqa launcher

The setup utility can attempt to launch Wathiqa only from standard Windows installation locations. It does not use a hard-coded customer path.

If Wathiqa is installed elsewhere, the utility instructs the user to use the normal Windows shortcut instead.

### 9. Production build configuration

Added:

```text
electron-builder.setup.json
```

with a separate application identity:

```text
com.wathiqa.office-setup
```

and product name:

```text
Wathiqa Office Setup
```

Build command:

```text
npm run build:office-setup
```

Development command:

```text
npm run office-setup
```

## Intentionally deferred

The following remain later phases in the approved plan:

- QR pairing.
- LAN discovery.
- Windows Firewall automation.
- Centralized file/storage hardening.
- Server-authoritative license hardening.
- Device management.
- Version compatibility enforcement.
- Final production installer/runtime verification.

## Acceptance requirement

Phase 5 implementation is structurally complete. Full acceptance requires Windows verification of:

1. Office Setup launches as a separate application.
2. Standalone configuration is saved and read by Wathiqa.
3. Server configuration is saved and read by Wathiqa.
4. Client configuration is saved and read by Wathiqa.
5. A client can test the server health endpoint from another physical Windows computer.
6. The same `deployment.json` is used by Setup and Wathiqa.
7. No server secrets are copied into the setup/client configuration.
8. The Office Setup installer builds successfully.
