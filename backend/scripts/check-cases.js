const db = require("../src/config/sqlite");

db.run(
  `
  CREATE TABLE IF NOT EXISTS client_attorneys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    client_id INTEGER NOT NULL,

    attorney_number TEXT NOT NULL,

    attorney_type TEXT,

    issue_date DATE,

    issuing_office TEXT,

    file_path TEXT,

    notes TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`,
  (err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }

    console.log("client_attorneys table created");

    process.exit(0);
  },
);
