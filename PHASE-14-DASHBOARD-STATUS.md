# Phase 14 — Dashboard Status

## Status

**IMPLEMENTED**

## Scope completed

- Live dashboard data from SQLite instead of hardcoded sample values.
- Authenticated `/api/dashboard` endpoint.
- Role-aware financial payload: financial data is omitted server-side for assistant users.
- KPI data: clients, active cases, today's hearings, urgent tasks, notifications.
- Today's hearings with case/client/court information.
- Upcoming hearings.
- Recent clients.
- Recent cases.
- Recent activity.
- Notifications scoped to the authenticated user.
- Service deadlines.
- Case-type distribution.
- Office/system/license status.
- Financial overview for authorized roles only.
- Removed the cancelled dashboard document quick action at runtime.
- Payment quick action no longer points to the read-only revenues page; it routes to cases for the authorized transaction workflow.
- No fabricated backup timestamp is displayed; unavailable backup information is shown as unavailable.
- Undefined success-rate business logic is not fabricated; the KPI displays `—` until a frozen success-rate definition exists.

## Files changed

- `backend/src/controllers/dashboard.controller.js`
- `backend/src/routes/dashboard.routes.js`
- `frontend/assets/js/core/app.js`
- `frontend/assets/js/pages/dashboard.js` remains the legacy page module, but the shared application bootstrap now owns Dashboard rendering to avoid changing its frozen file through a stale GitHub blob reference.

## Security

- Dashboard API requires JWT authentication.
- Notification data is filtered by `req.user.id` server-side.
- Financial data is returned only for `admin` and `lawyer` roles.
- Frontend financial hiding is supplementary; it is not the security boundary.

## Validation required locally

1. Start the backend.
2. Login as admin/lawyer and verify financial cards and financial overview.
3. Login as assistant and verify financial data is absent from the dashboard API response and UI.
4. Verify today's hearings and upcoming hearings.
5. Verify notifications belong only to the logged-in user.
6. Verify recent clients/cases/activity and service deadlines.
7. Verify no document quick action remains on Dashboard.
8. Verify payment quick action routes to the cases workflow.
9. Verify empty states with an empty database.
10. Verify the dashboard loads without console errors.
