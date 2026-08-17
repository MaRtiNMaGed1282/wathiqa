const db = require("../config/sqlite");

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

async function ensureClientSchema() {
  const columns = await all("PRAGMA table_info(clients)");
  if (!columns.length) return;

  const byName = new Map(columns.map((column) => [column.name, column]));
  const optionalFields = ["national_id", "phone", "address"];
  const needsMigration = optionalFields.some((name) => byName.get(name)?.notnull === 1);

  if (!needsMigration) return;

  const clientCodeExpression = byName.has("client_code") ? "client_code" : "NULL";
  const createdAtExpression = byName.has("created_at") ? "created_at" : "CURRENT_TIMESTAMP";

  try {
    await run("PRAGMA foreign_keys = OFF");
    await run("BEGIN TRANSACTION");

    await run(`
      CREATE TABLE clients_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_code TEXT,
        full_name TEXT NOT NULL,
        national_id TEXT,
        phone TEXT,
        address TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      INSERT INTO clients_new
        (id, client_code, full_name, national_id, phone, address, notes, created_at)
      SELECT
        id,
        ${clientCodeExpression},
        full_name,
        national_id,
        phone,
        address,
        notes,
        ${createdAtExpression}
      FROM clients
    `);

    await run("DROP TABLE clients");
    await run("ALTER TABLE clients_new RENAME TO clients");

    await run(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_national_id_unique
      ON clients(national_id)
      WHERE national_id IS NOT NULL AND national_id <> ''
    `);

    await run(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_client_code_unique
      ON clients(client_code)
      WHERE client_code IS NOT NULL AND client_code <> ''
    `);

    await run("COMMIT");
  } catch (error) {
    try {
      await run("ROLLBACK");
    } catch (_) {}
    throw error;
  } finally {
    try {
      await run("PRAGMA foreign_keys = ON");
    } catch (_) {}
  }
}

module.exports = { ensureClientSchema };
