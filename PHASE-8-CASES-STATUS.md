# Wathiqa — Phase 8 Cases Status

## Scope

Implemented against the frozen Phase 8 scope:

- `cases.html` backend support
- `case-profile.html` role visibility enforcement
- Case validation
- Broader/advanced case search
- Case filters
- Case authorization
- Case financial authorization
- Case file authorization
- Activity logging preservation

## Backend

### Cases

- Required case fields are validated on create/update.
- `total_fees` is validated as money.
- `closed_at` cannot precede `opened_at`.
- Referenced clients must exist.
- Search now covers case number, title, type, court, chamber, opponent, opponent lawyer, client name, and national ID.
- Existing server-side case filtering remains supported.
- Case deletion remains Admin-only.
- Create/update/delete operations retain Activity logging.
- Case creation retains notification behavior.

### Financial security

- Case list/profile routes continue through `redactFinancial` for Assistant.
- Payment and expense endpoints remain Admin/Lawyer-only.
- Assistant financial input remains rejected server-side.

### Case files

- View/upload are authenticated and role-authorized for Admin/Lawyer/Assistant.
- Delete is Admin-only.
- Upload verifies the case exists.
- Stored filenames are normalized to basenames.
- File deletion resolves the physical storage path safely and logs the mutation.

## Frontend role behavior

- Assistant cannot see the financial section on Case Profile.
- Assistant cannot see Case Profile payment/expense sections or their add controls.
- `auth.canDelete()` now reflects the frozen Admin-only destructive deletion model.
- Backend authorization remains the security boundary.

## Deferred / not marked as complete yet

- Full browser UI acceptance testing.
- Live API role-matrix testing.
- Authenticated file download/open endpoint and removal of unauthenticated static upload exposure should be completed in the dedicated file/security testing work before release.
- Final PDF integration belongs to Phase 19.
- Final Excel infrastructure belongs to Phase 20.

## Status

**Implementation: complete for the Phase 8 backend/security scope.**

**Phase acceptance testing: pending local runtime/browser execution.**
