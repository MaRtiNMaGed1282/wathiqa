# Wathiqa — Phase 12 Calendar Status

## Source of truth

Implemented strictly against the frozen Master Implementation Plan. Phase 12 requires hearings, service deadlines, add/edit/delete according to frozen permissions, date navigation, day/week/month views, event details, related case/service navigation, role enforcement, Activity logging, and loading/empty/error states. fileciteturn166file8L1-L24

## Backend

- [x] Unified `/api/hearings/calendar` endpoint
- [x] Hearing events
- [x] Service deadline events derived from `legal_services.due_date`
- [x] Optional `fromDate` / `toDate` filters with validation
- [x] Date-range validation
- [x] Case existence validation when creating hearings
- [x] Hearing date validation
- [x] Hearing update validation
- [x] Activity logging for create/update/delete
- [x] Existing notification behavior preserved for hearing creation
- [x] Delete remains Admin/Lawyer only
- [x] Add/Edit remains available to all three roles through the existing hearing authorization model

## Frontend

- [x] Day/month/week calendar views
- [x] Date navigation
- [x] Add hearing from date click or header action
- [x] Edit hearing from event details
- [x] Drag hearing to another date
- [x] Delete hearing for Admin/Lawyer only
- [x] Service deadlines shown as read-only calendar events
- [x] Service deadline opens Service Profile
- [x] Hearing opens Case Profile
- [x] Event details
- [x] Today list
- [x] Upcoming list
- [x] Today / 7-day / month / total counters
- [x] Loading states
- [x] Empty states
- [x] Error state
- [x] Arabic RTL FullCalendar
- [x] No external CDN dependency introduced

## Permission model

| Calendar action | Admin | Lawyer | Assistant |
|---|---:|---:|---:|
| View calendar | Yes | Yes | Yes |
| Add hearing | Yes | Yes | Yes |
| Edit hearing | Yes | Yes | Yes |
| Delete hearing | Yes | Yes | No |
| View service deadlines | Yes | Yes | Yes |
| Modify service deadline from calendar | No | No | No |

Service deadlines are derived from the Service record and therefore remain controlled by Service Profile/service authorization rather than becoming independent calendar records.

## Files changed

- `backend/src/controllers/hearings.controller.js`
- `backend/src/routes/hearings.routes.js`
- `frontend/pages/calendar.html`

## Acceptance tests still required locally

- [ ] Admin calendar
- [ ] Lawyer calendar
- [ ] Assistant calendar
- [ ] Add hearing
- [ ] Edit hearing
- [ ] Drag hearing
- [ ] Delete hearing as Admin
- [ ] Delete hearing as Lawyer
- [ ] Delete hearing as Assistant is denied
- [ ] Service deadline appears
- [ ] Service deadline opens Service Profile
- [ ] Hearing opens Case Profile
- [ ] Day/week/month views
- [ ] Empty calendar
- [ ] Backend/API failure state
- [ ] Activity entries after hearing mutations
- [ ] Persistence after application restart

## Next Phase

Phase 13 — Notifications.
