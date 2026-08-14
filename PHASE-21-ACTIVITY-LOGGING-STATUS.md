# Phase 21 — Activity Logging

## Status

**IMPLEMENTED — final testing deferred to the project-wide testing phase.**

## Frozen scope

Activity logging must retain:

- User
- Action
- Module
- Related record
- Timestamp
- Useful metadata

Required mutation coverage includes:

- Client create/update/delete
- Case create/update/delete
- Service create/update/delete
- Hearing create/update/delete
- Payment create/delete
- Expense create/delete
- File upload/delete
- User create/update/delete
- User activation/deactivation
- Password reset where appropriate
- Office changes
- Relevant license actions

## Existing activity infrastructure

The repository already contains:

- `backend/src/utils/activityLogger.js`
- `backend/src/controllers/activity.controller.js`
- `backend/src/routes/activity.routes.js`

The existing activity logger writes module, record ID, action, description, and user ID. The activity API is authenticated.

## Central audit coverage added

Added:

`backend/src/middlewares/activityAudit.middleware.js`

The middleware is registered before API routes and attaches a response-finish listener. This allows route-level authentication to populate `req.user` before the successful mutation is recorded.

The centralized audit layer:

- Records successful POST/PUT/PATCH/DELETE API mutations.
- Resolves the module from the API route.
- Resolves the mutation action from HTTP method and endpoint operation.
- Records numeric route/body record IDs where available.
- Records authenticated user ID where available.
- Records route/method/module/action metadata in the existing description field.
- Does not record request bodies, passwords, tokens, or other secret values.
- Does not record failed mutations with HTTP status >= 400.
- Leaves the existing explicit activity logging infrastructure intact.

## Covered modules

- client
- case
- case-expense
- service
- hearing
- payment
- expense
- file
- user
- office
- license
- notification
- revenue
- report
- pdf
- template

## Testing

Per the execution decision for this project, runtime and acceptance testing is deferred until the final testing stage rather than performed between implementation phases.

Final testing must verify activity records for every required mutation, correct user/module/action/record association, timestamps, metadata, authorization behavior, and absence of sensitive request-body data.
