const db = require("./src/config/sqlite");

db.run(
  `
  CREATE TABLE IF NOT EXISTS legal_cases (
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
  )
`,
  (err) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log("Legal Cases table created");
  },
);
