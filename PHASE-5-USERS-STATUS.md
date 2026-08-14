# Phase 5 — Users

## Specification basis

Implemented against the frozen Master Execution Plan. The page is `frontend/pages/users.html` and user administration remains Admin-only server-side.

## Completed

- Dedicated `users.html` page created.
- Total users statistic.
- Active users statistic.
- Inactive users statistic.
- Total Admins statistic.
- Users table with:
  - Full name
  - Email
  - Role
  - Status
  - Last login
  - Actions
- Add-user modal.
- Full name input.
- Username input.
- Existing automatic email generation behavior: `<username>@wathiqa.com`.
- Password input and confirmation.
- Frozen roles exposed by the new page: Admin, Lawyer, Assistant.
- Activate/deactivate action.
- Reset-password modal with confirmation.
- Delete confirmation.
- Search by full name, username, or email.
- Loading, empty, and error states.
- Admin-only frontend access gate.
- Admin-only sidebar navigation entry for Users.
- Cancelled Documents sidebar navigation removed from the shared sidebar.

## Backend hardening

- User routes remain protected by JWT + Admin authorization.
- User creation validates required fields, role, username format, and minimum password length.
- User creation preserves generated email behavior.
- Password hashes are never returned by the users list endpoint.
- Password reset sets `must_change_password = 1`.
- Password reset is activity-logged.
- User creation is activity-logged.
- Status changes are activity-logged.
- Deletion is activity-logged.
- Current user cannot delete their own account.
- Current user cannot deactivate their own account.
- Last Admin cannot be deleted.

## Compatibility

The existing `GET /api/users` response remains an array so the current embedded legacy users UI in `office-profile.html` is not broken by the Phase 5 backend work.

The Master Plan's separate `users.html` is now the frozen user-management page. The legacy embedded users tab in `office-profile.html` remains a cleanup target and should be removed during the planned legacy cleanup phase rather than silently changing office-profile scope here.

## Not claimed yet

Live browser/API acceptance testing has not been executed from the repository-only environment. The Master Plan requires full role acceptance and security testing in the later testing phases.
