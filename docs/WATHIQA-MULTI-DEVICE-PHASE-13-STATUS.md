# Wathiqa Multi-Device Phase 13 — Failure & Recovery

## Status

Implementation complete. Physical Windows/LAN acceptance testing remains pending.

## Implemented

- Client startup performs repeated health checks before opening the application.
- Client startup failure displays the configured office server address and a clear recovery message.
- Client startup automatically retries the server connection every 5 seconds instead of requiring a reinstall or a local fallback database.
- A client never creates or switches to an independent local authoritative database when the office server is unavailable.
- Client license validation is server-authoritative; an invalid client-side license state cannot open the activation flow.
- Once the server becomes reachable again, the client re-validates the office license and opens Wathiqa automatically.
- A running client monitors the office server every 15 seconds.
- The client generates a desktop notification when the server becomes unavailable.
- The client generates a desktop notification when the server becomes reachable again.
- Heartbeat failures are logged and do not create local state.
- Connection-monitor cleanup occurs when Wathiqa exits.
- Server/standalone mode continues to use the local backend and does not enable the client recovery monitor.

## Failure Cases Covered by the Implementation

### Server offline at client startup

Client shows an unavailable-server screen and retries automatically.

### Server goes offline while client is running

Client connection monitoring detects the transition and reports it through the desktop notification system. Existing frontend files are not modified.

### Server returns

The monitor reports recovery. If the application was still at startup/recovery state, the client re-checks health and license and opens the login page when valid.

### Invalid server URL

The health request rejects the configuration and the startup error identifies the invalid server URL condition.

### Port unavailable / timeout

Health checks time out and the client remains in recovery rather than starting another backend.

### Database unavailable on server

The server health/license request fails from the client perspective. The client does not create a replacement database.

### File storage unavailable

File operations remain server-authoritative through the existing API/storage layer; this phase does not introduce client-side file fallback.

## Frontend Restriction

No existing Wathiqa business frontend files were modified for Phase 13.

## Required Physical Acceptance Tests

1. Start PC2 with PC1 powered off; confirm recovery screen and automatic retry.
2. Start PC1; confirm PC2 reconnects without reinstalling or changing configuration.
3. Disconnect the LAN/Wi-Fi connection while PC2 is running; confirm offline notification.
4. Reconnect the network; confirm recovery notification.
5. Stop the Wathiqa server process; confirm the client does not create a local database.
6. Restart the server; confirm the client reconnects.
7. Configure an invalid server address; confirm clear failure handling.
8. Block the server port; confirm timeout/recovery behavior.
9. Test a server with an unavailable database; confirm the client remains server-dependent.
10. Confirm a valid server license is required before a client can open Wathiqa.
