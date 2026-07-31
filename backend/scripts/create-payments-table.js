const db = require("./src/config/sqlite");

db.run(
  `
  CREATE TABLE IF NOT EXISTS payments (
    payment_id INTEGER PRIMARY KEY AUTOINCREMENT,

    case_id INTEGER NOT NULL,

    amount REAL NOT NULL,

    payment_date TEXT NOT NULL,

    payment_method TEXT,

    notes TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
  `,
  (err) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log("Payments table created");
  },
);
