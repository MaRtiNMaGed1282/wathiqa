CREATE TABLE service_files (
    file_id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INTEGER,
    FOREIGN KEY(service_id) REFERENCES legal_services(service_id),
    FOREIGN KEY(uploaded_by) REFERENCES users(id)
);

CREATE INDEX idx_service_files_service_id ON service_files(service_id);
CREATE INDEX idx_service_files_uploaded_by ON service_files(uploaded_by);
