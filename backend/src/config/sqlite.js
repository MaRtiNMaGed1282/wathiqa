const sqlite3 = require("sqlite3").verbose();
const path = require("path");

let dbPath;

try {
  const { app } = require("electron");

  dbPath =
    app && app.isPackaged
      ? path.join(process.resourcesPath, "database", "wathiqa.db")
      : path.join(__dirname, "../../../database/wathiqa.db");
} catch {
  dbPath = path.join(__dirname, "../../../database/wathiqa.db");
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("SQLite connection failed:", err.message);
    process.exit(1);
  }

  console.log("SQLite Database Connected");
  console.log("Database Path:", dbPath);

  db.run(
    `
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      module TEXT,
      record_id INTEGER,
      user_id INTEGER,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
    (tableErr) => {
      if (tableErr) {
        console.error(
          "Failed to create notifications table:",
          tableErr.message,
        );
      }
    },
  );
});

module.exports = db;
