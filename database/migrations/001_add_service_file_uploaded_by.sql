-- Wathiqa Phase 2 migration
-- Adds the agreed service-file uploader field.
-- Field name: uploaded_by
-- The field references users(id).

PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

ALTER TABLE service_files
    ADD COLUMN uploaded_by INTEGER
    REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_service_files_service_id
    ON service_files(service_id);

CREATE INDEX IF NOT EXISTS idx_service_files_uploaded_by
    ON service_files(uploaded_by);

COMMIT;
