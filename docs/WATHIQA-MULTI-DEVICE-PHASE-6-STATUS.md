# Wathiqa Multi-Device — Phase 6 Status

## Phase

Phase 6 — Network Discovery and Pairing

## Status

**IMPLEMENTED — WINDOWS/LAN RUNTIME VERIFICATION REQUIRED**

## Implemented

### 1. Temporary server pairing

The server can generate a temporary pairing token with a 10-minute lifetime.

The token is stored in the shared deployment configuration and is cleared after a successful pairing request.

The QR payload contains only:

- Wathiqa pairing marker/version.
- Server URL.
- Server identity.
- Server port.
- Temporary pairing token.
- Expiration time.

It does not contain JWT secrets, license signing secrets, private keys, or the database.

### 2. QR generation

The Office Setup application generates the QR locally using `qrcode-generator`.

No external QR-generation service is required.

### 3. QR scanning

The client setup supports camera-based QR scanning through Chromium's `BarcodeDetector` where available.

A manual QR-payload paste field is provided as a fallback when camera/BarcodeDetector support is unavailable.

### 4. LAN discovery

The Wathiqa server advertises itself through a small UDP discovery responder on port `39455`.

Clients broadcast a discovery request and receive:

- Server identity.
- LAN address.
- Wathiqa port.
- Discovery protocol version.

Discovery does not expose pairing tokens.

### 5. Manual fallback

Manual server URL entry remains available:

```text
http://192.168.1.100:5000
```

### 6. Pairing validation

The Office Setup client can send the temporary QR token to:

```text
POST /api/system/pair
```

The server validates and consumes the token.

### 7. Shared configuration

The server and main Wathiqa application continue to use the same `deployment.json` under the shared Wathiqa user-data location.

## Architecture

```text
Office Server
    │
    ├── Express API :5000
    ├── SQLite
    ├── Central files
    └── UDP Discovery :39455
            │
            │ LAN broadcast
            ▼
      Office Setup Client
            │
            ├── Discover server
            ├── Scan QR
            ├── Test /api/system/health
            ├── POST /api/system/pair
            └── Save client deployment
```

## Intentionally deferred

- Windows Firewall automation — Phase 7.
- Advanced stable-name/network management — later deployment phases.
- Device management — Phase 11.
- Version compatibility enforcement — Phase 14.
- Full multi-device functional testing — Phase 15.

## Verification requirement

Static implementation is complete.

Runtime acceptance still requires two Windows devices on the same LAN:

1. PC1 configured as Wathiqa server.
2. PC1 running Wathiqa backend.
3. PC2 running Wathiqa Office Setup.
4. PC2 discovers PC1 through UDP discovery.
5. PC1 generates pairing QR.
6. PC2 scans the QR.
7. PC2 successfully calls `/api/system/health`.
8. PC2 successfully calls `/api/system/pair`.
9. Pairing token is consumed and cannot be reused.
10. PC2 saves client mode.
11. PC2 starts Wathiqa as a client of PC1.
12. Standalone mode remains unaffected.
