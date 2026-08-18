# Wathiqa Multi-Device — Phase 8 Status

## Scope

Phase 8 centralizes Wathiqa uploaded-file storage so the server installation is the authoritative owner of office files. Client PCs do not need a local copy of the Wathiqa backend or database to upload/download case and service files.

## Implemented

- Added `backend/src/services/fileStorage.service.js` as the single storage-path authority.
- Packaged Electron deployments use the Wathiqa Electron `userData` directory and its `uploads` subdirectory.
- Non-Electron development can use `WATHIQA_DATA_DIR`; otherwise it falls back to the Wathiqa data directory under the current user's home directory.
- Multer now writes uploads through the centralized storage service.
- Case-file upload/download/delete operations use centralized storage.
- Service-file upload/download/delete operations use centralized storage.
- Named case-file retrieval uses centralized storage.
- Existing legacy upload locations remain readable for backward compatibility; new writes use centralized storage.
- Path resolution is restricted to the storage directory and uses `path.basename` to prevent traversal.
- Added storage path tests.

## Multi-device behavior

In server mode:

`PC1 -> Wathiqa backend -> centralized uploads directory`

In client mode:

`PC2 -> HTTP API -> PC1 backend -> centralized uploads directory`

Therefore a file uploaded from PC2 is physically stored on PC1. A subsequent download from PC1 or PC2 is served by the same PC1 backend and storage directory.

## Existing frontend restriction

No existing Wathiqa business-application frontend files were changed in Phase 8. The implementation uses the existing `/api/files` endpoints.

## Verification

Static repository verification is complete. Actual two-Windows-PC upload/download testing remains required before release acceptance:

1. Configure PC1 as server.
2. Configure PC2 as client.
3. Upload a case file from PC2.
4. Confirm the file exists in PC1's Wathiqa user-data `uploads` directory.
5. Open/download it from PC2.
6. Open/download the same file from PC1.
7. Delete it from an authorized PC and confirm it disappears from the server storage.
8. Repeat with a service file.
