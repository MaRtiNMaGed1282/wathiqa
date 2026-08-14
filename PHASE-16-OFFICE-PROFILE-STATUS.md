# Phase 16 — Office Profile Status

## Status

**IMPLEMENTED — pending local runtime validation**

## Frozen scope

The frozen specification requires:

- Admin: office details, logo, stamp, license management, save/update, validation.
- Lawyer/Assistant: view only, with no management controls.
- Office data must be available for Client, Case, Service, Financial, and Reports PDFs.

## Backend implemented

### Office routes

- `GET /api/office`
  - Authenticated.
  - Admin/Lawyer/Assistant can read.
- `GET /api/office/asset/:type`
  - Authenticated.
  - Supports `logo` and `stamp` only.
- `POST /api/office`
  - Admin only.
  - Creates or updates the office record.
  - Validates supported text fields and email format.
  - Logs the mutation in Activity.
- `POST /api/office/upload`
  - Admin only.
  - Accepts logo/stamp uploads.
  - Logo/stamp are restricted to PNG/JPEG at controller level.
  - Existing upload middleware retains the project-wide size/type validation.
  - Logs the mutation and creates an informational notification.

### License integration

- Existing license activation remains available for the pre-login activation flow.
- Authenticated license read/validation/info endpoints are now protected.
- Office Profile exposes current license status and information.
- Admin can select a `.lic`/JSON license file and activate it from Office Profile.
- Lawyer/Assistant can view license information but cannot manage it.

## Frontend implemented

`frontend/pages/office-profile.html` was rewritten to match the frozen Office Profile scope.

### Admin

- Edit office details.
- Save/update office details.
- Upload logo.
- Upload stamp.
- View saved logo/stamp.
- View license status.
- View license metadata.
- Activate/replace license from the page.

### Lawyer / Assistant

- View office information.
- Fields are disabled.
- No save/update controls.
- No logo/stamp upload controls.
- No license-management controls.
- License status and metadata remain visible.

### Removed from Office Profile

- Users tab.
- User creation UI.
- User password reset UI.
- User management logic.

User management remains part of the dedicated `users.html` frozen page rather than Office Profile.

## PDF integration

The Office Profile now provides the authenticated office identity endpoint and identity-asset endpoints required by the later PDF infrastructure phase. The frozen execution order places the shared PDF infrastructure after Revenues/Reports, so the actual Client/Case/Service/Financial/Reports PDF generation integration remains part of that PDF infrastructure phase rather than inventing duplicate PDF implementations here.

## Required local validation before marking fully tested

1. Login as Admin and open Office Profile.
2. Verify all existing office values load.
3. Save updated office details.
4. Verify Activity entry is created.
5. Upload PNG logo.
6. Upload JPEG stamp.
7. Refresh and verify both assets persist.
8. Verify invalid logo/stamp types are rejected.
9. Verify Lawyer can view but cannot save.
10. Verify Assistant can view but cannot save.
11. Verify Lawyer/Assistant cannot upload office assets.
12. Verify authenticated office asset access.
13. Verify unauthenticated office API access returns `401`.
14. Verify license status loads for all authenticated roles.
15. Verify only Admin sees license activation controls.
16. Verify valid license activation from Office Profile.
17. Verify invalid license is rejected.
18. Verify no User Management controls remain on Office Profile.
19. Verify browser console/API errors are absent.
