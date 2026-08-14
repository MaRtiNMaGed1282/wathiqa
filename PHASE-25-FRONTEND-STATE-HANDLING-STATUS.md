# Phase 25 — Frontend State Handling

**Status:** IN PROGRESS

## Frozen Scope

Every frozen page must have:

- [x] Shared initial API loading indication
- [x] Shared mutation button busy-state protection
- [x] Shared duplicate in-flight mutation prevention
- [ ] Page-specific loading presentation where needed
- [ ] Arabic empty state
- [ ] Useful empty-state action where applicable
- [ ] User-friendly error message
- [ ] No stack traces shown to users
- [ ] Success feedback
- [ ] Refresh/update data after successful mutations
- [ ] Required validation
- [ ] Correct input types
- [x] Destructive-action confirmation where already present

## Shared Foundation — Completed

Updated `frontend/assets/js/api.js`:

- [x] Global API loading indicator.
- [x] Request-state tracking through `wathiqa:api-state`.
- [x] Automatic busy/disabled state for active mutation controls.
- [x] Duplicate in-flight mutation protection.
- [x] Existing API endpoint/method contract preserved.
- [x] Existing authorization/error behavior preserved.

## Page Progress

### Clients — IN PROGRESS

- [x] Required HTML fields added.
- [x] Correct input types added (`search`, `tel`, numeric input mode).
- [x] National ID length/pattern enforced in HTML.
- [x] Attorney file accept types added.
- [x] Search/summary regions marked for live updates.
- [x] Existing Arabic empty state retained.
- [x] Existing success feedback retained.
- [x] Existing delete confirmation retained.
- [ ] Page-specific initial error state.
- [ ] Page-specific retry action.
- [ ] Full state test.

### Cases — NOT STARTED
### Case Profile — NOT STARTED
### Change Password — NOT STARTED
### Client Profile — NOT STARTED
### Dashboard — NOT STARTED
### Calendar — NOT STARTED
### Services — NOT STARTED
### Service Profile — NOT STARTED
### Notifications — NOT STARTED
### Legal Library — NOT STARTED
### Law Viewer — NOT STARTED
### Office Profile — NOT STARTED
### Revenues — NOT STARTED
### Reports — NOT STARTED
### Login — NOT STARTED
### Activation — NOT STARTED
### Users — repository page currently absent; do not invent during this phase

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
