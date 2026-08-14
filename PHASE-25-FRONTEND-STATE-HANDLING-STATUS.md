# Phase 25 — Frontend State Handling

**Status:** IN PROGRESS — FINAL REGRESSION PENDING

## Shared Foundation

- [x] Global API loading indicator.
- [x] Request-state tracking.
- [x] Mutation busy-state protection.
- [x] Duplicate in-flight mutation prevention.
- [x] API success/error events.
- [x] Last API error retained for late state initialization.
- [x] Shared Arabic GET-error banner with retry for all frozen pages.
- [x] Existing API endpoint/method contract preserved.
- [x] Existing authorization/error behavior preserved.

`frontend/assets/js/phase25-state.js` is loaded through `auth.js`; Login and Activation load it directly because they do not use the authenticated shell.

## Page Audit

### Clients
- [x] Required fields/input types.
- [x] Arabic empty state.
- [x] Success feedback.
- [x] Delete confirmation.
- [x] Shared GET error/retry handling.
- [ ] Browser/API regression.

### Cases
- [x] Required fields/input types audited.
- [x] Arabic empty state.
- [x] Success feedback.
- [x] Shared GET error/retry handling.
- [x] Shared duplicate-submission protection.
- [ ] Browser/API regression.

### Case Profile
- [x] Loading foundation.
- [x] Arabic empty states for hearings/files/payments/expenses.
- [x] GET error/retry handling.
- [x] Success feedback.
- [x] Required validation.
- [x] Numeric financial input normalization.
- [x] Assistant financial visibility hidden.
- [x] Destructive confirmations retained.
- [ ] Browser/API regression.

### Change Password
- [x] Required fields.
- [x] Minimum password length 8.
- [x] New-password autocomplete.
- [x] Existing inline errors.
- [x] Existing success/redirect.
- [x] Shared duplicate-submission protection.
- [ ] Browser/API regression.

### Client Profile
- [x] Existing loading/empty states.
- [x] GET error/retry handling.
- [x] Attorney validation.
- [x] Attorney file type restrictions.
- [x] Assistant financial summary hidden.
- [x] Existing destructive confirmation.
- [ ] Browser/API regression.

### Dashboard
- [x] Shared loading/error handling.
- [x] Assistant revenue KPI hidden.
- [x] Assistant outstanding KPI hidden.
- [x] Assistant financial chart hidden.
- [x] Assistant payment action hidden.
- [ ] Browser/API regression.

### Calendar
- [x] Loading foundation.
- [x] Today's/upcoming empty states.
- [x] GET error/retry handling.
- [x] Hearing-form required validation.
- [x] Date/time input types.
- [x] Existing success/error feedback.
- [x] Calendar drag/drop mutation success path fixed.
- [ ] Browser/API regression.

### Services
- [x] Loading foundation.
- [x] Arabic empty state.
- [x] GET error/retry handling.
- [x] Required service/client/date fields.
- [x] Numeric fee input.
- [x] Existing success feedback.
- [ ] Browser/API regression.

### Service Profile
- [x] Loading foundation.
- [x] Empty states for files/payments/expenses.
- [x] GET error/retry handling.
- [x] Service-file input types.
- [x] Assistant financial visibility.
- [x] Assistant financial API calls skipped by page implementation.
- [x] Destructive confirmations.
- [ ] Browser/API regression.

### Notifications
- [x] Initial Arabic loading state.
- [x] Existing NotificationCenter empty/error behavior.
- [x] Refresh and mark-all-read actions.
- [x] Shared GET error/retry handling.
- [x] Duplicate-submission protection.
- [ ] Browser/API regression.

### Legal Library / Laws / Law Viewer
- [x] Existing loading states.
- [x] Existing Arabic empty states.
- [x] Existing GET error states.
- [x] Search/download/view flows audited.
- [x] Shared GET error/retry handling.
- [ ] Browser/API regression.

### Office Profile
- [x] Existing page-state handling.
- [x] Admin-only edit/asset/license controls.
- [x] Existing loading/error feedback.
- [x] Shared GET error/retry handling.
- [ ] Browser/API regression.

### Revenues
- [x] Existing financial loading state.
- [x] Existing financial error state.
- [x] Existing filtering validation.
- [x] Assistant access denied / financial content hidden.
- [x] Shared GET error/retry handling.
- [ ] Browser/API regression.

### Reports
- [x] Operational report available.
- [x] Financial report restricted to Admin/Lawyer.
- [x] Existing loading/error feedback.
- [x] Existing custom-period validation.
- [x] Shared GET error/retry handling.
- [ ] Browser/API regression.

### Login
- [x] Required email/password validation.
- [x] Password minimum length 8.
- [x] Current-password autocomplete.
- [x] Arabic error feedback.
- [x] Button loading state.
- [x] Duplicate-submission protection.
- [ ] Browser/API regression.

### Activation
- [x] License file validation.
- [x] Required license selection.
- [x] Arabic validation/error feedback.
- [x] Button loading state.
- [x] Duplicate-submission protection.
- [x] Success redirect.
- [ ] Browser/API regression.

### Users
- [x] Admin-only access state.
- [x] Required create-user fields.
- [x] Search/empty state.
- [x] Status/reset/delete actions.
- [x] Self-delete protection.
- [x] Destructive confirmation.
- [x] Success/error feedback.
- [x] Duplicate-submission protection.
- [ ] Browser/API regression.

## Regression Gate

The static implementation audit is complete. The remaining gate is execution in a real browser against the running backend.

### Required browser/API checks

1. Open every frozen page with backend online.
2. Confirm initial loading state resolves correctly.
3. Confirm populated state renders correctly.
4. Confirm empty state renders correctly where applicable.
5. Stop or disconnect the backend and verify Arabic error/retry behavior.
6. Restore the backend and verify retry/reload recovery.
7. Exercise every mutation button/form once.
8. Rapidly repeat each mutation and verify duplicate in-flight requests are blocked.
9. Verify destructive confirmation dialogs.
10. Verify Assistant cannot see or invoke financial UI/API flows.
11. Verify Admin/Lawyer financial access remains functional.
12. Verify Calendar date creation, drag/drop update, event details, and case navigation.
13. Verify Login → Dashboard and Login → Change Password flows.
14. Verify Activation → Login flow.
15. Verify file upload/download/view flows.
16. Verify Excel/PDF/print report flows where applicable.

## Frozen Pages

1. `activation.html`
2. `calendar.html`
3. `case-profile.html`
4. `cases.html`
5. `change-password.html`
6. `client-profile.html`
7. `clients.html`
8. `dashboard.html`
9. `law-viewer.html`
10. `laws.html`
11. `library.html`
12. `login.html`
13. `notifications.html`
14. `office-profile.html`
15. `reports.html`
16. `revenues.html`
17. `service-profile.html`
18. `services.html`
19. `users.html`

**Phase 25 remains open only for final browser/API regression. Do not freeze the phase until the regression gate passes.**
