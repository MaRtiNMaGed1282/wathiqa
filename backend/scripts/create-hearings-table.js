const db = require("./src/config/sqlite");

db.run(
  `
  CREATE TABLE IF NOT EXISTS hearings (
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
  )
  `,
  (err) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log("Hearings table created");
  },
);
