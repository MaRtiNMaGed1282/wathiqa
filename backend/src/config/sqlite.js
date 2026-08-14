const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

function getElectronUserDataDir() {
  try {
    const { app } = require("electron");
    if (app && app.isPackaged) return app.getPath("userData");
  } catch (_) {}
  return null;
}

function getRestoreRoot() {
  return path.join(process.env.WATHIQA_BACKUP_DIR || path.join(require("os").homedir(), "Wathiqa", "backups"), "pending-restore");
}

function applyPendingRestore(dbPath, userDataDir) {
  const pending = getRestoreRoot();
  const pendingDb = path.join(pending, "wathiqa.db");
  if (!fs.existsSync(pendingDb)) return;

  fs.copyFileSync(pendingDb, dbPath);

  const uploadDir = userDataDir ? path.join(userDataDir, "uploads") : path.join(__dirname, "../../../uploads");
  const attorneyDir = userDataDir ? path.join(userDataDir, "attorneys") : path.join(__dirname, "../../../database/attorneys");

  for (const [sourceName, target] of [["uploads", uploadDir], ["attorneys", attorneyDir]]) {
    const source = path.join(pending, sourceName);
    if (!fs.existsSync(source)) continue;
    fs.rmSync(target, { recursive: true, force: true });
    fs.cpSync(source, target, { recursive: true });
  }

  fs.rmSync(pending, { recursive: true, force: true });
}

function resolveDatabasePath() {
  const userDataDir = getElectronUserDataDir();

  if (userDataDir) {
    const databaseDir = path.join(userDataDir, "database");
    const persistentDbPath = path.join(databaseDir, "wathiqa.db");
    const bundledDbPath = path.join(process.resourcesPath, "database", "wathiqa.db");
    fs.mkdirSync(databaseDir, { recursive: true });

    if (!fs.existsSync(persistentDbPath)) {
      if (!fs.existsSync(bundledDbPath)) throw new Error(`Bundled database not found: ${bundledDbPath}`);
      fs.copyFileSync(bundledDbPath, persistentDbPath);
    }

    applyPendingRestore(persistentDbPath, userDataDir);
    return persistentDbPath;
  }

  const localDbPath = path.join(__dirname, "../../../database/wathiqa.db");
  applyPendingRestore(localDbPath, null);
  return localDbPath;
}

const dbPath = resolveDatabasePath();

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("SQLite connection failed:", err.message);
    process.exit(1);
  }

  console.log("SQLite Database Connected");
  console.log("Database Path:", dbPath);

  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    module TEXT,
    record_id INTEGER,
    user_id INTEGER,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (tableErr) => {
    if (tableErr) console.error("Failed to create notifications table:", tableErr.message);
  });
});

module.exports = db;
module.exports.dbPath = dbPath;
