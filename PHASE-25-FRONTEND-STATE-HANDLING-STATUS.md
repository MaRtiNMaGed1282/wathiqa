# Phase 25 — Frontend State Handling

**Status:** IN PROGRESS

## Frozen Scope

Every frozen page must have:

- [x] Shared initial API loading indication
- [x] Shared mutation button busy-state protection
- [x] Shared duplicate in-flight mutation prevention
- [x] Cases page loading presentation
- [x] Cases page Arabic empty state
- [x] Cases page error message and retry action
- [x] Cases page success feedback
- [x] Cases page required validation
- [x] Cases page correct input types / file accept types
- [x] Existing destructive confirmations retained
- [ ] Complete all remaining pages

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
- [x] Correct input types added.
- [x] National ID constraints enforced in HTML.
- [x] Attorney file accept types added.
- [x] Existing Arabic empty state retained.
- [x] Existing success feedback retained.
- [x] Existing delete confirmation retained.
- [ ] Page-specific initial error state.
- [ ] Page-specific retry action.
- [ ] Full state test.

### Cases — IMPLEMENTED IN UPLOADED SOURCE / PENDING REPOSITORY WRITE

- [x] Initial loading state.
- [x] Arabic empty state retained.
- [x] Error state with retry action.
- [x] Search/filter error feedback.
- [x] Required case fields.
- [x] File accept types.
- [x] Client selection validation.
- [x] Success feedback and refresh after creation.
- [x] Existing centralized API usage retained.
- [x] Escaping of rendered case text.

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
### Users — NOT STARTED

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
