# Phase 4 — Central Authorization Middleware

## Completed

- Reusable `authorize(...roles)` middleware created.
- Supported roles are exactly `admin`, `lawyer`, and `assistant`.
- Unauthorized requests receive HTTP 401.
- Authenticated users outside the allowed role set receive HTTP 403.
- Existing Admin middleware now delegates to the central middleware.
- User administration is Admin-only.
- Client deletion is Admin-only.
- Case deletion is Admin-only.
- Service deletion is Admin-only.
- Calendar deletion is Admin/Lawyer-only; Assistant retains operational calendar access.
- Case-file deletion is Admin/Lawyer-only.
- Attorney-file deletion is Admin/Lawyer-only.
- Payments are Admin/Lawyer-only.
- Case expenses are Admin/Lawyer-only.
- Service expenses are Admin/Lawyer-only.
- Client financial summary/case-financial data are Admin/Lawyer-only.
- Revenue endpoints are Admin/Lawyer-only.
- Revenue report endpoint is Admin/Lawyer-only.
- Office management is Admin-only; office viewing is available to all roles.
- License management endpoints are Admin-only while activation and runtime validation remain public for the existing activation/runtime flow.
- Legal Library is authenticated read-only for all roles.
- Notifications remain restricted to the authenticated user's own records by controller query conditions.
- Dashboard is authenticated for all roles.
- Assistant financial response redaction is applied to operational case/service/dashboard responses.
- Assistant financial input mutation for `total_fees` is blocked server-side.

## Frozen role matrix source

The Master Execution Plan defines:

- Clients: Admin full; Lawyer/Assistant except delete.
- Cases: Admin full; Lawyer/Assistant except delete.
- Case Profile: Admin full; Lawyer except delete/financial restrictions; Assistant operational only.
- Calendar: Admin/Lawyer full; Assistant operational with restricted destructive actions.
- Services: Admin full; Lawyer/Assistant except delete.
- Service Profile: Admin/Lawyer full; Assistant operational with no financial access.
- Revenues: Admin/Lawyer only.
- Reports: Admin/Lawyer full; Assistant operational only.
- Dashboard: Admin/Lawyer full; Assistant operational with no financial access.
- Notifications: own records only.
- Office: Admin full; Lawyer/Assistant view.
- Users: Admin only.
- Legal Library: read-only for all roles.
- Password: own; Admin can reset others.

## Verification status

Static route/controller review was completed against the repository implementation and the frozen role model.

Live runtime/API acceptance remains part of the later security and role-acceptance testing phases, as required by the Master Execution Plan. No claim of live HTTP execution is made from the repository-only environment.
