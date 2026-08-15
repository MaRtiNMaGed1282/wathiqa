# Phase 52 — Session / Security Management

## Status
Implemented. Runtime testing intentionally deferred.

## Scope completed
- Persistent `user_sessions` SQLite table.
- Cryptographically random JWT `jti` per login.
- SHA-256 token hash stored server-side; raw JWT is never stored.
- Session metadata: IP address, user-agent, creation time, last activity, expiry, revocation time.
- Seven-day session lifetime aligned with the existing JWT lifetime.
- Authentication middleware now requires a valid, non-revoked, non-expired server-side session.
- Legacy JWTs without a `jti` are rejected and require a fresh login.
- Current-session touch/last-seen tracking.
- Secure current-session logout endpoint.
- Logout-all-other-sessions endpoint.
- Per-session revocation endpoint.
- Password change revokes all other sessions while preserving the current authenticated session.
- Login/logout/session-revocation activity logging.
- Security page showing current/active/expired sessions.
- Users can terminate other sessions without being able to terminate the current session from the session list.
- Sidebar link to the security/session page.

## Security boundaries
- Session records are user-scoped.
- Session endpoints use the existing authentication middleware.
- Existing role and permission authorization remains in place.
- No raw access token is displayed or persisted by the session-management page.

## Testing
Not performed. Full project testing remains deferred until the remaining feature phases are complete.
