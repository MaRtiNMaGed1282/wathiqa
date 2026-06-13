const db = require("./src/config/sqlite");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS license (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      office_name TEXT NOT NULL,
      license_key TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      payload TEXT,
      signature TEXT
    )
  `);

  console.log("License table created.");
});
