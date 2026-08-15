# PHASE 48 — Calendar ↔ Cases Integration

## Status
Complete for the current canonical data model.

## Implemented

- Calendar reads from the canonical `hearings` table for court hearings.
- Calendar reads `legal_services.due_date` for service deadlines.
- Legacy `court_sessions` is not used by the unified Calendar.
- Calendar events include case/client context where applicable.
- Hearing events open the related case profile.
- Service deadline events open the related service profile.
- New hearings are created through the existing authenticated `/api/hearings` API.
- Existing hearing drag-to-edit uses the existing authenticated hearing update API.
- Existing hearing delete/update authorization remains enforced by the backend.
- Calendar supports Arabic RTL month/week/day views through the locally hosted FullCalendar assets.
- Calendar statistics distinguish today's hearings, the next seven days, service deadlines, and total events.
- Calendar loading and API error states are present.

## Service deadline behavior

A service deadline is derived from `legal_services.due_date`; it is not an independent database record. Therefore the Calendar does not create or delete standalone service-deadline records. Opening a service event takes the user to the service profile, where the underlying service (including its due date) is managed through the existing service workflow.

This preserves the canonical service model and avoids creating a second deadline record that could become inconsistent with `legal_services`.

## Authorization

The Calendar remains authenticated. Existing backend authorization for hearing updates/deletes is preserved. The Calendar does not bypass the existing role/permission enforcement.

## Testing

Runtime testing is intentionally deferred until the complete Wathiqa feature set is finished, per the project execution decision.
