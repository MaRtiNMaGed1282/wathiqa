# Phase 47 — Case Deadlines & Reminders

Status: IMPLEMENTED — runtime testing deferred to the final project testing cycle.

## Scope

The existing Wathiqa data model is used; no parallel generic deadline table was introduced.

Deadline sources:
- `hearings.hearing_date`
- `legal_services.due_date`

Existing `notifications` infrastructure is reused for reminders.

## Backend

Added:
- `GET /api/deadlines`
- `backend/src/controllers/deadlines.controller.js`
- `backend/src/routes/deadlines.routes.js`
- `backend/src/services/deadlineReminder.service.js`

The deadline endpoint is authenticated and returns combined hearing/service deadlines with remaining days and urgency classification.

## Reminder policy

The scheduler checks hourly and sends reminders for deadlines occurring:
- 7 days before
- 3 days before
- 1 day before
- On the due date

Reminders are created only once for the same user, module, record, reminder message, and deadline occurrence.

Active users receive the reminders so the office is not dependent on a single assigned user for hearing visibility.

## Dashboard

Dashboard now includes:
- combined hearing/service deadlines for the next 30 days
- urgent-task count for deadlines in the next 3 days
- deadline cards with type, client, date, and relative urgency
- links to the relevant calendar/service page

## Existing data preservation

No existing hearing or service records are migrated, duplicated, or rewritten by this feature.

## Testing

Not performed yet. Full runtime/regression testing remains intentionally deferred until all planned feature additions are complete.
