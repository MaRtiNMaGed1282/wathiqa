# Wathiqa — Phase 7 Clients Status

## Frozen source

Phase 7 is implemented against the Master Execution Plan's Clients scope:

- `clients.html`: search, date filter, table, add, edit, Admin-only delete, export, loading/empty/error states.
- `client-profile.html`: client information, cases, services, activity, relevant attorney records/files, financial information only for permitted roles, role restrictions.
- Validation: required fields, phone presence, 14-digit national ID, duplicate handling through the existing backend constraints, and server-side Admin-only deletion.

## Backend

### Client list

Added `GET /api/clients/list`.

Supports server-side:

- `filter=all`
- `filter=today`
- `filter=week`
- `filter=month`
- `filter=year`
- `filter=custom&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- search by full name
- client code
- national ID
- phone

Only operational client fields are returned.

### Client cases

Added `GET /api/clients/:id/cases` for operational client-profile case navigation. It deliberately excludes financial case fields.

### Financial isolation

Existing financial client endpoints remain Admin/Lawyer-only. Client Profile requests the financial summary only when the current role is permitted. Assistant therefore receives no financial profile data from the dedicated financial endpoint and the operational case listing contains no financial fields.

### Deletion

Client deletion remains server-side Admin-only through `authorize("admin")`.

## Frontend

### `clients.html`

Implemented:

- Search
- Server-side date filter
- Custom start/end date
- Table
- Add modal
- Edit modal behavior through the same modal
- Admin-only delete action
- Client profile navigation
- Excel export of the currently displayed dataset
- Loading state
- Empty state
- Error state
- Local assets only

### `client-profile.html`

Implemented:

- Client information
- Cases
- Services
- Activity
- Attorney records
- Attorney upload
- Attorney deletion for permitted delete roles
- Financial summary only for Admin/Lawyer
- Role-safe operational content
- Loading/error handling
- Navigation back to previous page

## Verification status

Static implementation review is complete.

Live API/browser testing remains pending until the actual local Wathiqa runtime is executed. No live test result is claimed from the repository-only environment.

## Deferred by frozen execution order

The Client Profile PDF generation is not implemented independently here because the Master Plan places the reusable PDF infrastructure in Phase 19. The Client Profile page is prepared for that later shared PDF layer rather than introducing a separate PDF implementation.
