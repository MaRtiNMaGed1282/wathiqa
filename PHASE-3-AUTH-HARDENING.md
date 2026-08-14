# Wathiqa — Phase 3 Authentication Hardening

**Repository:** `MaRtiNMaGed1282/wathiqa`
**Branch:** `phase-1-baseline`
**Basis:** frozen Master Execution Plan + audited repository/database

## Implemented

### Login

- Validates email and password presence.
- Rejects unknown credentials.
- Rejects inactive users before issuing a JWT.
- Generates JWT containing the authenticated user identity and role.
- Returns `must_change_password`.
- Returns identity fields without `password_hash`.
- Updates `last_login` after successful authentication.

### First login / password change

- `/api/auth/change-password` now requires an authenticated JWT.
- The target user is taken from `req.user.id`.
- Email is no longer accepted as an identity selector.
- `must_change_password` is cleared after successful password change.
- Users marked `must_change_password` are blocked by the authentication middleware from normal protected API access until the password is changed.
- The password-change request itself remains available to an authenticated first-login user.
- Minimum password length remains the existing backend rule of 8 characters.
- Password hashes are never returned.
- Password changes are recorded in Activity.

### Active-user enforcement

The authentication middleware now re-reads the current user from the database after JWT verification. This means:

- Deleted users cannot continue using a valid old JWT.
- Deactivated users cannot continue using a valid old JWT.
- Current database role/state is authoritative rather than trusting stale role/state values in the token.

### Admin reset

The existing admin-only reset endpoint already:

- Requires authentication.
- Requires the `admin` middleware.
- Resets the selected user's password.
- Sets `must_change_password = 1`.
- Logs the reset in Activity.

No new admin-reset workflow was invented.

## Frontend status

The frozen product contains `change-password.html`, but the Master Plan's execution order places shared frontend infrastructure after Phase 5. Therefore the page implementation is intentionally deferred until the shared frontend infrastructure phase rather than introducing a second authentication/frontend architecture prematurely.

## Validation performed

- JavaScript syntax checks were performed against the updated authentication controller/middleware/route structure.
- Database inspection confirms the required user fields exist in the actual audited database.

Full live API/login testing remains dependent on running the actual Wathiqa backend environment with its installed dependencies and database path. No credentials were guessed or invented.

## Not changed in Phase 3

- JWT expiration policy remains 7 days because the frozen plan does not specify a different duration.
- Environment secret fallback handling remains for the later Production Configuration phase.
- Central reusable role middleware belongs to Phase 4.
- Users page implementation belongs to Phase 5.
- Shared frontend infrastructure belongs to Phase 6.
