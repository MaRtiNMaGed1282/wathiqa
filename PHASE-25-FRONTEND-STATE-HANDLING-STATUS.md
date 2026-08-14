# Phase 25 — Frontend State Handling

**Status:** IN PROGRESS

## Frozen Scope

Every frozen page must have:

- [x] Shared initial API loading indication
- [x] Shared mutation button busy-state protection
- [x] Shared duplicate in-flight mutation prevention
- [x] Case Profile page-level loading/error handling foundation
- [x] Client Profile page-level loading/error handling foundation
- [x] Arabic empty states retained on audited pages
- [x] Success feedback retained on audited pages
- [x] Validation attributes and input types normalized on audited forms
- [x] Assistant financial UI hidden on Case Profile, Client Profile, Dashboard, and Service Profile
- [x] Change Password required/minimum-length validation normalized
- [x] Destructive confirmations retained where already present
- [ ] Complete remaining page-by-page audits

## Shared Foundation — Completed

Updated `frontend/assets/js/api.js`:

- [x] Global API loading indicator.
- [x] Request-state tracking through `wathiqa:api-state`.
- [x] Automatic busy/disabled state for active mutation controls.
- [x] Duplicate in-flight mutation protection.
- [x] API success/error state events.
- [x] Last API error state retained for late page-state initialization.
- [x] Existing API endpoint/method contract preserved.
- [x] Existing authorization/error behavior preserved.

Added `frontend/assets/js/phase25-state.js` and loaded it through `auth.js`.

## Page Progress

### Clients — IN PROGRESS

- [x] Required HTML fields added.
- [x] Correct input types added.
- [x] National ID length/pattern enforced in HTML.
- [x] Attorney file accept types added.
- [x] Search/summary regions marked for live updates.
- [x] Existing Arabic empty state retained.
- [x] Existing success feedback retained.
- [x] Existing delete confirmation retained.
- [ ] Page-specific initial error state.
- [ ] Page-specific retry action.
- [ ] Full state test.

### Cases — IN PROGRESS

- [x] Shared loading/busy/duplicate-submission foundation applies.
- [x] Arabic empty state retained.
- [x] Existing success feedback retained.
- [x] Required-field/input-type audit performed.
- [ ] Page-specific initial error state.
- [ ] Page-specific retry action.
- [ ] Full state test.

### Case Profile — IN PROGRESS

- [x] Shared loading/busy/duplicate-submission foundation applies.
- [x] Existing Arabic empty states retained for hearings/files/payments/expenses.
- [x] GET API error state with Arabic retry banner added.
- [x] Existing success feedback retained.
- [x] Required validation applied to key edit/hearing/payment/expense inputs.
- [x] Numeric input types and decimal input mode normalized for financial fields.
- [x] Assistant financial sections/actions hidden by shared page-state handler.
- [x] Existing destructive confirmations retained.
- [ ] Full browser/API state test.

### Change Password — IN PROGRESS

- [x] Required validation retained and reinforced through shared state handler.
- [x] Minimum password length of 8 enforced through HTML validation.
- [x] New-password autocomplete normalized.
- [x] Existing inline error feedback retained.
- [x] Existing button loading feedback retained.
- [x] Existing success feedback and redirect retained.
- [ ] Full browser/API state test.

### Client Profile — IN PROGRESS

- [x] Shared loading/busy/duplicate-submission foundation applies.
- [x] Existing Arabic loading/empty states retained for client data, cases, services, attorneys, and activity.
- [x] GET API error state with Arabic retry banner added.
- [x] Existing success feedback retained for attorney mutations.
- [x] Required attorney form fields normalized.
- [x] Attorney file accepted types normalized.
- [x] Assistant financial summary hidden by shared page-state handler.
- [x] Existing attorney destructive confirmation retained.
- [ ] Full browser/API state test.

### Dashboard — IN PROGRESS

- [x] Shared loading/busy/duplicate-submission foundation applies.
- [x] Assistant revenue KPI hidden.
- [x] Assistant outstanding/receivables KPI hidden.
- [x] Assistant financial chart section hidden.
- [x] Assistant payment quick action hidden.
- [ ] Page-specific loading/empty/error audit.
- [ ] Full browser/API state test.

### Service Profile — IN PROGRESS

- [x] Shared loading/busy/duplicate-submission foundation applies.
- [x] Existing Arabic empty states retained for service files, payments, and expenses.
- [x] GET API error state with Arabic retry banner added.
- [x] Existing success feedback retained for uploads/deletions.
- [x] Service-file input accepted types normalized.
- [x] Existing financial visibility restriction retained for Assistant.
- [x] Financial API calls are skipped for Assistant by the page implementation.
- [x] Existing destructive confirmations retained.
- [ ] Full browser/API state test.

### Remaining Pages

- [ ] Calendar
- [ ] Services
- [ ] Notifications
- [ ] Legal Library
- [ ] Law Viewer
- [ ] Office Profile
- [ ] Revenues
- [ ] Reports
- [ ] Login
- [ ] Activation
- [ ] Users

## Remaining

- [ ] Complete every frozen page.
- [ ] Audit all form validation and input types.
- [ ] Audit all empty states.
- [ ] Audit all page-level errors and retry behavior.
- [ ] Test every mutation for duplicate submission.
- [ ] Test backend-offline/error recovery without broken UI state.
- [ ] Run final Phase 25 regression.

## Frozen Pages

1. `activation.html`
2. `calendar.html`
3. `case-profile.html`
4. `cases.html`
5. `change-password.html`
6. `client-profile.html`
7. `dashboard.html`
8. `law-viewer.html`
9. `laws.html`
10. `library.html`
11. `login.html`
12. `notifications.html`
13. `office-profile.html`
14. `reports.html`
15. `revenues.html`
16. `service-profile.html`
17. `services.html`
18. `users.html`
19. `clients.html`

## Rule

Do not mark Phase 25 complete until all applicable items above are implemented and tested. The frozen architecture and page scope must not be changed.
