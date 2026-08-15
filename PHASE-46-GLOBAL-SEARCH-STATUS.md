# Phase 46 — Global Search

## Status

Implementation complete; runtime testing deferred.

## Scope

The existing authenticated global search was retained and expanded without replacing the existing search UI.

### Search coverage

- Clients: full name, client code, national ID, phone, address.
- Cases: case number, title, type, court name, court branch.
- Services: service title and description.
- Hearings: session number, courtroom, linked case number and case title.
- Payments: payment reference and notes.
- Files: file name and linked case number context.
- Templates: title.
- Legal library laws: title and category are now returned by the global search API for future/UI consumption.

## Existing frontend behavior preserved

- Debounced search.
- Minimum two-character query.
- Recent searches.
- Client/case/service/hearing/payment/file/template result groups.
- Keyboard navigation.
- Result caching.
- Authenticated `/api/search` access.

## Security

The search endpoint remains authenticated. Search uses parameterized SQLite queries and escaped LIKE patterns.

## Testing

No runtime testing performed yet. This remains part of the final project-wide testing cycle.
