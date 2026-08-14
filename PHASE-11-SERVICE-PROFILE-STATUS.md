# Wathiqa — Phase 11 Service Profile Status

## Scope

Implemented against the frozen Master Implementation Plan. The Service Profile now represents a real legal service file rather than a case-profile derivative.

## Service Profile sections

- [x] Header/actions
- [x] Service information
- [x] Client information/link
- [x] Description
- [x] Notes
- [x] Status/priority
- [x] Financial summary for Admin/Lawyer
- [x] Payments for Admin/Lawyer
- [x] Expenses for Admin/Lawyer
- [x] Service files
- [x] Activity/history
- [x] PDF/print action
- [x] Related case navigation when `linked_case_id` exists

## Removed from Service Profile

- [x] Template modal
- [x] Template selector
- [x] Template attachment workflow
- [x] Template JavaScript
- [x] Template UI
- [x] Legacy case-file API usage
- [x] Case-only profile fields
- [x] Stale case/hearing rendering

## Role behavior

| Area | Admin | Lawyer | Assistant |
|---|---:|---:|---:|
| Service data | Full | Full | Operational |
| Edit service | Yes | Yes | Yes |
| Delete service | Yes | No | No |
| Financial summary | Yes | Yes | No |
| Payments | Yes | Yes | No |
| Expenses | Yes | Yes | No |
| Financial PDF/print content | Yes | Yes | No |
| Service files | Yes | Yes | Yes |
| Delete service file | Yes | Yes | No |
| Activity | Yes | Yes | Yes |

## Backend changes

- Added `/api/activity/service/:id`.
- Service activity timeline includes service mutations plus related payment, expense, and service-file activity.
- Fixed service payment creation so a payment may belong to a service without requiring a `case_id`.
- Service payment creation validates the referenced service/case and payment date/amount.
- Existing financial endpoints remain Admin/Lawyer-only.

## Frontend changes

- Rebuilt `frontend/pages/service-profile.html` around the frozen Service Profile scope.
- Added role-aware financial removal for Assistant.
- Added Admin-only service deletion control.
- Added loading/error/empty states for service, financial data, files, and activity.
- Added browser print/PDF action; Assistant print view contains no financial sections.
- Integrated the Phase 10 service-file subsystem.

## Files changed

- `frontend/pages/service-profile.html`
- `frontend/assets/js/service-files.js`
- `backend/src/controllers/activity.controller.js`
- `backend/src/routes/activity.routes.js`
- `backend/src/controllers/payments.controller.js`

## Runtime verification

The GitHub connector cannot execute the local Electron/Node runtime or the user's local SQLite database from this environment. Local acceptance testing remains required for API/UI behavior.

## Acceptance checklist

- [ ] Admin service profile
- [ ] Lawyer service profile
- [ ] Assistant service profile
- [ ] Assistant financial API denial
- [ ] Service edit
- [ ] Admin service delete
- [ ] Payment create/delete
- [ ] Expense create/delete
- [ ] Service file upload/list/open/download/delete
- [ ] Activity timeline
- [ ] Browser print/PDF output
- [ ] Reload persistence

## Next Phase

Phase 12 — Calendar.
