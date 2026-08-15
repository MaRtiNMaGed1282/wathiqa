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

  db.run(`CREATE TABLE IF NOT EXISTS user_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    module TEXT NOT NULL,
    can_view INTEGER NOT NULL DEFAULT 0,
    can_create INTEGER NOT NULL DEFAULT 0,
    can_edit INTEGER NOT NULL DEFAULT 0,
    can_delete INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, module),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`, (tableErr) => {
    if (tableErr) {
      console.error("Failed to create user_permissions table:", tableErr.message);
      return;
    }

    db.all(`SELECT id, role FROM users`, [], (usersErr, users) => {
      if (usersErr) {
        console.error("Failed to initialize user permissions:", usersErr.message);
        return;
      }

      const { MODULES, getRoleDefaults } = require("./permissions");
      db.serialize(() => {
        const insert = db.prepare(`
          INSERT OR IGNORE INTO user_permissions
            (user_id, module, can_view, can_create, can_edit, can_delete)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        users.forEach((user) => {
          const defaults = getRoleDefaults(user.role);
          MODULES.forEach(({ key }) => {
            const permission = defaults[key] || {};
            insert.run(user.id, key, Number(permission.view) || 0, Number(permission.create) || 0, Number(permission.edit) || 0, Number(permission.delete) || 0);
          });
        });
        insert.finalize();
      });
    });
  });

  db.run(`CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    jti TEXT NOT NULL UNIQUE,
    token_hash TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`, (tableErr) => {
    if (tableErr) console.error("Failed to create user_sessions table:", tableErr.message);
  });
});

module.exports = db;
module.exports.dbPath = dbPath;
