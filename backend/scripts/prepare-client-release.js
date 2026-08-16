const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "../..");
const dbPath = path.join(root, "database", "wathiqa.db");
const uploadsDirs = [
  path.join(root, "uploads"),
  path.join(root, "backend", "uploads"),
  path.join(root, "database", "attorneys"),
];

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found: ${dbPath}`);
  process.exit(1);
}

const db = new sqlite3.Database(dbPath);

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

async function main() {
  await run("PRAGMA foreign_keys = OFF");

  const admins = await all(
    `SELECT id FROM users WHERE role = 'admin' AND is_active = 1 ORDER BY id LIMIT 1`,
  );

  if (admins.length === 0) {
    throw new Error("No active admin account exists. Create/restore the admin account before preparing the client release.");
  }

  const adminId = admins[0].id;
  const tables = await all(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`,
  );

  // Preserve only the admin account and the license row. All operational,
  // financial, audit, session, notification, permission and office data is removed.
  const keepTables = new Set(["users", "license"]);

  await run("BEGIN TRANSACTION");
  try {
    for (const { name } of tables) {
      if (keepTables.has(name)) continue;
      await run(`DELETE FROM "${name.replace(/"/g, '""')}"`);
    }

    await run(
      `DELETE FROM users WHERE id <> ?`,
      [adminId],
    );

    await run(
      `UPDATE users
       SET is_active = 1,
           last_login = NULL,
           must_change_password = 0
       WHERE id = ?`,
      [adminId],
    );

    // A client build must start unlicensed and require the customer's .lic file.
    await run(
      `UPDATE license
       SET office_name = NULL,
           license_key = NULL,
           expiry_date = NULL,
           is_active = 0,
           payload = NULL,
           signature = NULL
       WHERE id = 1`,
    );

    await run("COMMIT");
  } catch (error) {
    await run("ROLLBACK");
    throw error;
  }

  for (const dir of uploadsDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir)) {
      fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
    }
  }

  const remainingUsers = await all(`SELECT id, email, role FROM users`);
  const remainingLicense = await all(`SELECT id, is_active FROM license LIMIT 1`);

  console.log("Client release prepared successfully.");
  console.log("Users:", remainingUsers);
  console.log("License:", remainingLicense);
  console.log("Operational data and uploaded files: cleared");
}

main()
  .catch((error) => {
    console.error("Client release preparation failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => db.close());
