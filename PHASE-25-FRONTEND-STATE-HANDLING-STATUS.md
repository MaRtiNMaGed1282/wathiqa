# Phase 25 — Frontend State Handling

**Status:** IN PROGRESS

## Frozen Scope

Every frozen page must have:

- [x] Shared initial API loading indication
- [x] Shared mutation button busy-state protection
- [x] Shared duplicate in-flight mutation prevention
- [x] Case Profile page-level loading/error handling foundation
- [x] Case Profile Arabic empty states retained
- [x] Case Profile success feedback retained
- [x] Case Profile validation attributes and input types normalized
- [x] Case Profile Assistant financial UI hidden
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

### Remaining Pages

- [ ] Change Password
- [ ] Client Profile
- [ ] Dashboard
- [ ] Calendar
- [ ] Services
- [ ] Service Profile
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
