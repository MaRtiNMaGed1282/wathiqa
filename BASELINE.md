# Wathiqa — Phase 1 Repository & Runtime Baseline

**Repository:** `MaRtiNMaGed1282/wathiqa`
**Baseline branch:** `phase-1-baseline`
**Baseline commit:** `eb4bae383760c3e7bfaea7a578b2b186c150c7ba`
**Audit basis:** repository tree + source files + frozen Master Execution Plan.

## 1. Frozen product contract

The Master Execution Plan defines 19 frozen pages and explicitly cancels `documents.html` and `templates.html`, including template UI, template attachment/upload workflows, template APIs, and obsolete document navigation. Backend authorization is the security boundary; the database is the source of truth; assistant financial visibility must remain zero where restricted; important mutations must be logged; assets must remain local; and no silent business-rule changes are permitted.

## 2. Repository inventory

### Root

- `.gitignore`
- `package.json`
- `package-lock.json`
- `tailwind.config.js`
- `project-files.txt`
- `README.md` (currently empty)
- `assets/wathiqa.ico`
- `backend/`
- `database/`
- `frontend/`
- `electron/`

### Backend

- Express application and server entrypoint
- SQLite configuration
- Authentication controller/routes
- Users, clients, cases, services, hearings, files, payments, expenses, dashboard, notifications, office, license, library, attorneys, activity, and search controllers/routes
- JWT auth middleware
- Admin middleware
- Upload middleware/configuration
- Activity logger
- File validation
- Notification service
- License verification
- Legacy template/document/session modules are still present and must be removed only after dependency verification.

### Frontend

The repository currently contains the frozen 19-page set, plus cancelled `documents.html` and `templates.html`.

Shared assets include Cairo fonts, local Tailwind output, local FullCalendar, Lucide, SweetAlert2, Toastify, and XLSX vendor files.

There is also a separate Vite starter-style `frontend/src` tree (`main.js`, `style.css`, `counter.js`, Vite/JavaScript assets). This is not part of the frozen 19-page HTML architecture and should be treated as legacy/unused unless dependency analysis proves otherwise.

### Database

- `database/schema.sql` exists but is currently **empty (0 bytes)**.
- `database/wathiqa.db` is not committed because `*.db` is ignored.
- Law PDFs are committed under `database/laws/`.
- Attorney PDFs are committed under `database/attorneys/`.
- The actual SQLite schema therefore cannot be established from `schema.sql` alone; the local/runtime DB must be inspected in Phase 2.

### Electron

- `electron/main.js` starts the backend by requiring `backend/src/server`.
- It waits for `http://localhost:5000`, validates the license, then opens login or activation.
- Packaged builds use Electron-specific DB path logic in `sqlite.js`.

## 3. Immediate findings / risks

### CRITICAL — hard-coded fallback secrets

`backend/src/config/env.js` falls back to hard-coded values for `JWT_SECRET` and `LICENSE_SECRET` when environment variables are absent. The frozen plan requires production secrets to be configured securely and forbids committing/signing-secret exposure.

**Required later fix:** fail fast when required secrets are absent in production; never use predictable production fallbacks.

### CRITICAL — first-login password change is not protected

`POST /api/auth/change-password` is currently unauthenticated and accepts an email plus new password. The controller updates the account solely by email. This conflicts with the frozen authentication requirements, which require authenticated current-user password changes and a controlled first-login flow.

**Required later fix:** separate first-login flow from normal authenticated password change, enforce `must_change_password`, and remove arbitrary email-based password changes.

### HIGH — inactive users are not rejected at login

The login query selects by email but does not visibly enforce `is_active`.

**Required later fix:** reject inactive users before issuing JWTs.

### HIGH — centralized role authorization is missing

Only a dedicated `admin.middleware.js` exists. Most feature routes use authentication only. The frozen plan requires reusable role authorization and server-side enforcement of every role-specific operation.

**Required later fix:** introduce centralized role/permission middleware and apply it to every protected operation.

### HIGH — financial endpoints are currently authenticated but not visibly role-restricted at route level

Client financial summaries/revenue/dashboard endpoints, payment endpoints, expense endpoints, and related operations use `auth` but do not use a financial role guard in their routes. The frozen architecture explicitly forbids Assistant access to financial information, including financial profile data, payments, expenses, reports, PDFs, and Excel exports.

**Required later fix:** enforce financial authorization server-side and verify controllers do not leak restricted fields.

### HIGH — cancelled template backend is still wired

`app.js` mounts `/api/templates` and `/template-files`, and the repository still contains `templates.controller.js`, `templates.routes.js`, and `multerTemplates.js`. The frozen plan explicitly cancels the template feature.

**Required later fix:** dependency-audit these references, then remove the complete template subsystem.

### HIGH — cancelled document backend references remain

Empty `documents.controller.js` and `documents.routes.js` remain in the repository. The frozen plan requires cancelled document references to be removed.

**Required later fix:** verify no active dependency, then remove them.

### MEDIUM — duplicate/static upload path handling

`app.js` mounts `/uploads` twice with different paths. This needs consolidation during the file/storage audit.

### MEDIUM — hard-coded localhost desktop API dependency

Electron license validation and backend readiness checks use `http://localhost:5000`. The production configuration phase must ensure the packaged application does not depend on development-only assumptions.

### MEDIUM — backend package dependency mismatch

`backend/package.json` directly requires SQLite through `../config/sqlite.js`, but `sqlite3` is declared at the root package level rather than in `backend/package.json`. This may work from the monorepo root depending on installation layout, but it is fragile and should be normalized.

### MEDIUM — duplicate dependency/runtime architecture

The repository has a root Electron/backend dependency set and a separate frontend Vite dependency set. The frozen product is primarily an Electron + local HTML/JS architecture, so the Vite starter tree should not remain as accidental production architecture.

## 4. Runtime verification status

The following cannot be honestly marked verified from this audit environment:

- backend startup
- SQLite connection against the local `database/wathiqa.db`
- frontend browser runtime
- login against the real DB
- Electron packaged runtime
- browser console errors
- live API errors

The database is intentionally ignored by Git and is not present in the repository tree. These checks require the actual local runtime/database.

## 5. Phase 1 checklist status

| Task | Status |
|---|---|
| Inventory project root | COMPLETE |
| Inventory backend | COMPLETE |
| Inventory frontend | COMPLETE |
| Inventory database/schema | PARTIAL — DB file not committed; schema.sql empty |
| Inventory controllers | COMPLETE |
| Inventory routes | COMPLETE |
| Inventory middleware | COMPLETE |
| Inventory upload middleware | COMPLETE |
| Inventory PDF/export utilities | PARTIAL — no dedicated backend PDF utility identified in current tree; frontend XLSX vendor exists |
| Inventory Electron configuration | COMPLETE |
| Inventory dependencies | COMPLETE |
| Identify duplicate/legacy pages | COMPLETE — Vite starter tree + cancelled pages identified |
| Identify duplicate dashboard implementations | FLAGGED — dashboard endpoints exist under clients plus dedicated dashboard route/controller |
| Identify template code | COMPLETE — active legacy subsystem identified |
| Identify document code | COMPLETE — empty legacy subsystem identified |
| Identify obsolete API references | FLAGGED — templates/documents and static template path remain |
| Identify hard-coded/demo data | PARTIAL — requires broader source/content scan |
| Start backend | BLOCKED — runtime DB unavailable in audit environment |
| Verify DB connection | BLOCKED — runtime DB unavailable |
| Verify frontend | BLOCKED — no local runtime |
| Verify login | BLOCKED — no local DB/runtime |
| Record console/API/database errors | BLOCKED — requires runtime |

## 6. Phase 1 conclusion

The repository is not yet ready to advance as a clean implementation baseline without addressing the security and architecture risks above. The most important blockers for the next phases are:

1. secure authentication/password-change flow;
2. centralized server-side authorization;
3. financial isolation for Assistant;
4. database/schema recovery and migration baseline;
5. removal of cancelled template/document subsystems;
6. production-safe secret/configuration handling.

Runtime verification remains a separate required gate once the local SQLite database and application environment are available.
