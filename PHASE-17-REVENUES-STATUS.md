# Phase 17 — Revenues Status

## Status

**IMPLEMENTED — pending local runtime validation and Phase 19 PDF integration**

The frozen plan defines Revenues as a read-only financial overview for Admin/Lawyer and forbids Assistant access. The page includes summary metrics, activity, receivables, date filters, top debtors, recent payments, and the financial authorization boundary.

## Backend

### New financial authorization middleware

`backend/src/middlewares/financial.middleware.js`

Allows only:

- `admin`
- `lawyer`

Rejects:

- `assistant` → HTTP 403

### New Revenues API

`backend/src/routes/revenues.routes.js`

`backend/src/controllers/revenues.controller.js`

Endpoints:

- `GET /api/revenues/summary`
- `GET /api/revenues/clients`
- `GET /api/revenues/top-debtors`
- `GET /api/revenues/recent-payments`

All endpoints require authentication and financial authorization.

### Financial aggregation

The API calculates from the existing database tables:

- Case fees
- Service fees
- Total fees
- Payments from both cases/services
- Case expenses
- Service expenses
- Remaining
- Net profit
- Collection rate
- Client/case/service counts
- Client receivables
- Top debtors
- Recent payments

No financial transaction CRUD was added to Revenues. The frozen architecture keeps transaction management in Case Profile / Service Profile.

## Date filters

Implemented server-side:

- Today
- This week
- This month
- This year
- All
- Custom start/end

The custom range is validated server-side. The week is represented as Monday–Sunday.

## Frontend

`frontend/pages/revenues.html` was rewritten.

Implemented:

- Financial summary hero
- Case/service fee breakdown
- Collection rate/progress bar
- Total clients
- Total cases
- Total services
- Total fees
- Collected
- Remaining
- Expenses
- Net profit
- Top 5 debtors
- Recent payments
- Client receivables table
- Client-name search
- Debtor count
- Total outstanding amount
- Date filter controls
- Custom date range
- Loading state
- Empty states
- Error state
- Direct client-profile navigation
- HTML escaping for displayed database values

## Role behavior

### Admin

- Full Revenues visibility.

### Lawyer

- Full Revenues visibility.

### Assistant

- Revenues content is hidden in the UI.
- Direct API access is denied server-side with HTTP 403.
- No financial data is returned through the Revenues API.

## PDF export

The frozen Phase 17 specification requires Financial PDF export. The master plan separately defines Phase 19 as the reusable PDF infrastructure layer. To preserve the frozen architecture and avoid creating a duplicate one-off PDF implementation, the Revenues page currently exposes the PDF requirement as pending Phase 19 integration.

Phase 19 must connect the Revenues dataset to the shared PDF layer with:

- Office identity
- Logo
- Stamp
- Period
- Summary
- Breakdown
- Debtors
- Receivables
- Generation timestamp
- Server-side financial authorization

## Local validation checklist

1. Admin can open Revenues.
2. Lawyer can open Revenues.
3. Assistant cannot access Revenues API.
4. Assistant direct page access displays no financial data.
5. Summary loads.
6. Case fees are correct.
7. Service fees are correct.
8. Payments include case and service payments.
9. Case expenses are included.
10. Service expenses are included.
11. Remaining = total fees - collected.
12. Net profit = collected - expenses.
13. Collection rate is correct.
14. Today filter is correct.
15. Week filter is correct.
16. Month filter is correct.
17. Year filter is correct.
18. Custom filter is correct.
19. Invalid custom range is rejected.
20. Client search works.
21. Top 5 debtors are correct.
22. Recent payments are correct.
23. Receivables table is correct.
24. Empty data produces clean empty states.
25. Backend errors produce a visible error state.
26. No financial API endpoint is accessible to Assistant.
27. No critical console errors.
28. Phase 19 PDF integration remains pending.
