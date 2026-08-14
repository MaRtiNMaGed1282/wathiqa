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

  db.run(
    `
    CREATE TABLE IF NOT EXISTS service_files (
      file_id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      file_size INTEGER NOT NULL DEFAULT 0,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      uploaded_by INTEGER,
      FOREIGN KEY(service_id) REFERENCES legal_services(service_id),
      FOREIGN KEY(uploaded_by) REFERENCES users(id)
    )
    `,
    (tableErr) => {
      if (tableErr) {
        console.error(
          "Failed to create service_files table:",
          tableErr.message,
        );
        return;
      }

      db.all("PRAGMA table_info(service_files)", [], (pragmaErr, columns) => {
        if (pragmaErr) {
          console.error(
            "Failed to inspect service_files schema:",
            pragmaErr.message,
          );
          return;
        }

        const names = new Set(columns.map((column) => column.name));
        const migrations = [];

        if (!names.has("mime_type")) {
          migrations.push(
            `ALTER TABLE service_files ADD COLUMN mime_type TEXT NOT NULL DEFAULT 'application/octet-stream'`,
          );
        }

        if (!names.has("file_size")) {
          migrations.push(
            `ALTER TABLE service_files ADD COLUMN file_size INTEGER NOT NULL DEFAULT 0`,
          );
        }

        let index = 0;
        const runNext = () => {
          if (index >= migrations.length) {
            db.run(
              `CREATE INDEX IF NOT EXISTS idx_service_files_service_id ON service_files(service_id)`,
            );
            db.run(
              `CREATE INDEX IF NOT EXISTS idx_service_files_uploaded_by ON service_files(uploaded_by)`,
            );
            return;
          }

          db.run(migrations[index], (migrationErr) => {
            if (migrationErr) {
              console.error("Service file migration failed:", migrationErr.message);
            }
            index += 1;
            runNext();
          });
        };

        runNext();
      });
    },
  );
});

module.exports = db;
