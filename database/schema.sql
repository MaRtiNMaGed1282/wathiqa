CREATE TABLE activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE case_expenses (
  expense_id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  expense_type TEXT NOT NULL,
  amount REAL NOT NULL,
  expense_date DATE NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE case_files (
    file_id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE case_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL,
    template_id INTEGER NOT NULL,
    attached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(case_id) REFERENCES cases(id),
    FOREIGN KEY(template_id) REFERENCES legal_templates(id)
);

CREATE TABLE client_attorneys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    attorney_number TEXT NOT NULL,
    attorney_type TEXT,
    issue_date DATE,
    issuing_office TEXT,
    file_path TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    national_id TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    client_code TEXT
);

CREATE TABLE hearings (
    hearing_id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL,
    hearing_date TEXT NOT NULL,
    hearing_time TEXT,
    hearing_type TEXT,
    judge_name TEXT,
    courtroom TEXT,
    hearing_result TEXT,
    notes TEXT,
    next_hearing_date TEXT,
    postponement_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE laws (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    law_number TEXT,
    category TEXT,
    description TEXT,
    pdf_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE legal_cases (
    case_id INTEGER PRIMARY KEY AUTOINCREMENT,
    court_case_number TEXT,
    client_id INTEGER NOT NULL,
    case_title TEXT NOT NULL,
    case_type TEXT,
    court_name TEXT,
    court_chamber TEXT,
    opponent_name TEXT,
    opponent_lawyer TEXT,
    opened_at TEXT NOT NULL,
    closed_at TEXT,
    case_status TEXT,
    priority_level TEXT,
    case_description TEXT,
    final_result TEXT,
    total_fees REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE legal_services (
    service_id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    service_number TEXT,
    service_type TEXT NOT NULL,
    service_title TEXT NOT NULL,
    description TEXT,
    service_status TEXT DEFAULT 'جديدة',
    total_fees REAL DEFAULT 0,
    start_date TEXT,
    due_date TEXT,
    completed_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    assigned_to TEXT,
    notes TEXT,
    priority_level TEXT DEFAULT 'عادية',
    linked_case_id INTEGER,
    FOREIGN KEY(client_id) REFERENCES clients(id)
);

CREATE TABLE legal_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    tags TEXT,
    file_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE license (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    office_name TEXT NOT NULL,
    license_key TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    payload TEXT,
    signature TEXT
);

CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    module TEXT,
    record_id INTEGER,
    user_id INTEGER,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE office_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    office_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    secondary_phone TEXT,
    email TEXT NOT NULL,
    address TEXT NOT NULL,
    logo_path TEXT,
    stamp_path TEXT,
    tax_number TEXT,
    commercial_register TEXT,
    license_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER,
    service_id INTEGER,
    amount REAL NOT NULL,
    payment_date TEXT NOT NULL,
    payment_method TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE service_expenses (
    expense_id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL,
    expense_type TEXT NOT NULL,
    amount REAL NOT NULL,
    expense_date DATE NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(service_id) REFERENCES legal_services(service_id) ON DELETE CASCADE
);

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

CREATE TABLE test (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT
);

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'lawyer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    must_change_password INTEGER DEFAULT 1,
    username TEXT,
    last_login DATETIME,
    is_active INTEGER DEFAULT 1
);

CREATE INDEX idx_service_files_service_id ON service_files(service_id);
CREATE INDEX idx_service_files_uploaded_by ON service_files(uploaded_by);
