# Phase 15 — Legal Library Status

## Status

**IMPLEMENTED — pending local runtime validation**

## Frozen scope implemented

### `library.html`
- Read-only legal library.
- Search by law title or category.
- Browse available laws.
- Open law viewer.
- Download law PDF.
- Empty/loading/error states.
- No CRUD controls.
- Removed the cancelled Templates card/reference.

### `laws.html`
- Read-only law listing.
- Server-backed search.
- View law.
- Download law PDF.
- No add/edit/delete operations.
- HTML output escapes law metadata before rendering.

### `law-viewer.html`
- Loads law metadata through authenticated API.
- Loads PDF through authenticated API.
- Displays PDF in viewer using an object URL.
- Download uses authenticated API/blob flow.
- No public static PDF URL is required.

## Backend

- `/api/library/*` now requires JWT authentication.
- `GET /api/library/laws`
  - Search supported through `search` query parameter.
  - Category filtering supported through `category` query parameter.
  - Read-only.
- `GET /api/library/laws/:id`
  - Returns law metadata.
  - Read-only.
- `GET /api/library/laws/:id/file`
  - Authenticated PDF open/download endpoint.
  - Validates the stored filename.
  - Prevents path traversal.
  - Returns only PDF content from the laws directory.

## Security correction

The previous public `/laws-files` static directory was removed from `app.js`. Legal PDFs are now served only through the authenticated library API.

## Preserved architecture

- All three roles can read the Legal Library.
- No Legal Library CRUD was introduced.
- Templates remain cancelled.
- No CDN dependency was introduced.
- No financial functionality was added.

## Local validation required

1. Login as Admin and open `library.html`.
2. Search by title and category.
3. Open a law.
4. Confirm the PDF renders.
5. Download the PDF.
6. Repeat as Lawyer.
7. Repeat as Assistant.
8. Confirm unauthenticated API calls return `401`.
9. Confirm `/laws-files/<file>` is no longer publicly served.
10. Test an invalid law ID.
11. Test a missing PDF.
12. Test a traversal-style `pdf_path` value against the file endpoint.
13. Verify browser console has no errors.
