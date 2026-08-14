# Phase 25 — Frontend State Handling

**Status:** IN PROGRESS

## Frozen Scope

Every frozen page must have:

- Initial loading
- Button loading where needed
- Arabic empty state
- Useful empty-state action where applicable
- User-friendly error message
- No stack traces shown to users
- Success feedback
- Data refresh/update after successful mutations
- Required validation
- Correct input types
- Duplicate-submission prevention
- Destructive-action confirmation

## Completed — Shared API Foundation

- [x] Added a shared global API loading indicator.
- [x] Added request-state events through `wathiqa:api-state`.
- [x] Added automatic busy-state handling for active mutation buttons/submit controls.
- [x] Added duplicate in-flight mutation protection.
- [x] Preserved the existing API endpoint/method contract.
- [x] Preserved existing Arabic API error messages.

## Remaining

- [ ] Audit and complete loading states page-by-page.
- [ ] Audit and complete empty states page-by-page.
- [ ] Audit and complete error feedback page-by-page.
- [ ] Audit and complete success feedback/data refresh page-by-page.
- [ ] Audit required form validation and input types.
- [ ] Audit destructive-action confirmations.
- [ ] Test every frozen page.
- [ ] Test every mutation for duplicate submission.
- [ ] Test backend-offline/error recovery without broken UI state.

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

## Rule

Do not mark Phase 25 complete until all applicable items above are implemented and tested against the frozen page scope.
