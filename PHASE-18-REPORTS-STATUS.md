# Wathiqa — Phase 18 Reports Status

**Phase:** 18 — Reports
**Status:** Core implementation completed; runtime acceptance pending.
**Architecture:** Frozen; no scope changes introduced.

## Implemented

### Operational reports — all authenticated roles

- Clients report/count
- Cases report/count
- Services report/count
- Hearings/deadlines report
- Case status breakdown
- Service status breakdown
- Activity report
- Actual case/service/hearing/activity datasets returned by the API
- Server-side date filters: all, today, week, month, year, custom
- Invalid custom date validation

### Financial reports — Admin/Lawyer only

- Revenue / fees
- Case fees
- Service fees
- Payments
- Expenses
- Profit
- Collection rate
- Remaining receivables
- Client receivables
- Case profitability
- Service profitability
- Server-side financial authorization

### Frontend

- Rebuilt `frontend/pages/reports.html` around the frozen Reports scope
- Operational section available to all roles
- Financial section restricted through the shared permission helper
- Date filter controls
- Operational tables
- Financial tables
- Loading/error/empty states
- Local SheetJS Excel export using the actual loaded datasets
- Print-to-PDF workflow for the current report view
- No CDN dependency introduced

### Backend

- Added `backend/src/controllers/reports.controller.js`
- Added `backend/src/routes/reports.routes.js`
- Registered `/api/reports`
- `/api/reports/operational` requires authentication
- `/api/reports/financial` requires authentication + financial role

## Security

Assistant must receive HTTP 403 for `/api/reports/financial` because the route uses the existing financial middleware.

Operational report data contains no financial fields.

## Pending acceptance

- Start backend locally
- Test operational endpoint as Admin/Lawyer/Assistant
- Test financial endpoint as Admin/Lawyer/Assistant
- Verify all date filters against database data
- Verify Excel workbook opens and contains expected sheets
- Verify print/PDF output visually
- Check browser console and API errors
- Mark Phase 18 fully DONE only after runtime acceptance

## Next phase

Phase 19 — PDF Infrastructure.
