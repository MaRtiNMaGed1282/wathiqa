# Phase 27 — Security Testing Status

## Scope

Security testing follows the frozen Master Implementation Plan exactly:

- Authentication
- Authorization
- Assistant financial isolation
- File security
- Direct API bypass resistance

Source: `Wathiqa_Master_Implementation_Plan.md`, Phase 27.

## 1. Static Security Audit

### Authentication

| Test | Result | Evidence |
|---|---|---|
| Missing token | PASS — middleware returns 401 | `auth.middleware.js` |
| Invalid token | PASS — `jwt.verify` failure returns 401 | `auth.middleware.js` |
| Malformed/missing bearer token | PASS — missing token returns 401 | `auth.middleware.js` |
| Wrong email | TEST HARNESS READY | Requires running API/database |
| Wrong password | TEST HARNESS READY | Requires running API/database |
| Inactive user | NOT YET VERIFIED | Requires real inactive-user fixture |
| First-login password requirement | NOT YET VERIFIED | Requires real user fixture |
| Change password authentication | PASS by code inspection | `auth.routes.js` uses `auth`; controller uses `req.user.id` |

### Authorization

| Area | Result | Evidence |
|---|---|---|
| Admin-only users API | PASS | `users.routes.js` uses `auth, admin` |
| Client deletion | PASS | `clients.routes.js` uses `role("admin")` |
| Case deletion | PASS | `cases.routes.js` uses `role("admin")` |
| Service deletion | PASS | `services.routes.js` uses `role("admin")` |
| Hearing update/delete | PASS | `hearings.routes.js` uses `role("admin", "lawyer")` |
| Case-file deletion | PASS | `files.routes.js` uses `role("admin", "lawyer")` |
| Service-file deletion | PASS | `files.routes.js` uses `role("admin", "lawyer")` |

### Assistant financial isolation

The financial middleware permits only `admin` and `lawyer` and returns 403 for other roles.

Protected modules verified by code inspection:

- Revenues
- Expenses
- Payments
- Financial reports
- Financial PDF
- Client financial endpoints
- Dashboard monthly revenue
- Revenue/debtor endpoints

The automated security harness contains direct Assistant API tests for the core financial endpoints.

### File security

| Test | Result | Evidence |
|---|---|---|
| Extension allow-list | PASS by code inspection | `fileValidation.js` |
| MIME allow-list | PASS by code inspection | `fileValidation.js` |
| 5 MB size limit | PASS by code inspection | Multer limits |
| Filename sanitization | PASS by code inspection | `sanitizeFilename()` |
| Stored upload filename | PASS | Generated from timestamp + sanitized filename |
| Service file download authentication | PASS | Route uses `auth` |
| Unauthorized file deletion | PASS | Route uses role middleware |
| Unauthorized direct static upload access | **FAIL — finding 27-01** | `app.js` exposes `/uploads` through `express.static` without auth |
| Attorney file static access | **FAIL — finding 27-02** | `app.js` exposes `/attorney-files` through `express.static` without auth |
| Case-file authenticated download endpoint | **NOT IMPLEMENTED** | Current file routes have upload/list/delete but no authenticated case download route |
| Path traversal | PASS for generated upload names; **requires endpoint-level test** | Stored filenames are generated server-side |

## 2. Security Findings

### Finding 27-01 — Public `/uploads` directory

`backend/src/app.js` currently mounts the upload directory with `express.static` without authentication.

This bypasses the API authorization boundary and means knowledge of a stored path can expose a file without a JWT.

**Severity: CRITICAL**

This must be resolved before Phase 27 can be considered complete.

### Finding 27-02 — Public `/attorney-files` directory

`backend/src/app.js` currently mounts the attorney-file directory with `express.static` without authentication.

**Severity: HIGH**

The route must not provide an unauthenticated bypass to stored client/attorney files.

### Finding 27-03 — Case-file download API is incomplete

The case-file routes currently provide upload/list/delete but no dedicated authenticated download/open endpoint.

**Severity: HIGH**

The security fix should use an authenticated API boundary rather than restoring public static access.

### Finding 27-04 — JWT secret fallback exists in source

`backend/src/config/env.js` contains a hard-coded fallback JWT secret.

This is not a live secret leak if the fallback is intentionally replaced by environment configuration, but it is unsafe for production and conflicts with the final security requirement that JWT/signing secrets not be committed.

**Severity: HIGH for production configuration**

The production configuration phase must require a real environment secret rather than relying on the fallback.

## 3. Automated Security Test Harness

Added:

```text
backend/scripts/security-tests.js
```

The harness tests:

- Missing token
- Malformed token
- Wrong email
- Wrong password
- Role authentication
- Assistant denial of revenues
- Assistant denial of financial reports
- Assistant denial of payments
- Assistant denial of expenses
- Assistant denial of financial PDF
- Assistant deletion restrictions
- Financial PDF authentication
- Change-password authentication

It uses Node's built-in `fetch` and requires no additional test framework.

### Required environment variables for full role testing

```text
SECURITY_TEST_BASE_URL=http://localhost:5000/api
SECURITY_ADMIN_EMAIL=...
SECURITY_ADMIN_PASSWORD=...
SECURITY_LAWYER_EMAIL=...
SECURITY_LAWYER_PASSWORD=...
SECURITY_ASSISTANT_EMAIL=...
SECURITY_ASSISTANT_PASSWORD=...
```

Without real role credentials, the role-specific tests are intentionally skipped rather than guessed.

## 4. Phase 27 Current State

**NOT FROZEN.**

The authentication and role middleware structure is substantially protected, but the file-security boundary has two critical/high findings that must be resolved and then tested against the running API.

Next execution target inside Phase 27:

1. Replace public upload static access with authenticated file access.
2. Protect attorney-file access.
3. Add authenticated case-file download/open endpoint.
4. Update affected frontend file links to use the authenticated API.
5. Run the complete security harness against the running backend with real Admin/Lawyer/Assistant accounts.
6. Re-test all Phase 27 checklist items.
7. Freeze Phase 27 only after all critical/high findings are closed.
