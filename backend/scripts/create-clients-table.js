const db = require("./src/config/sqlite");

db.run(
  `
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_code TEXT,
    full_name TEXT NOT NULL,
    national_id TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`,
  (err) => {
    if (err) {
      console.error("خطأ في إنشاء جدول الموكلين:", err.message);
      return;
    }

    db.run(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_national_id_unique
      ON clients(national_id)
      WHERE national_id IS NOT NULL AND national_id <> ''
    `, (indexError) => {
      if (indexError) {
        console.error("خطأ في إنشاء فهرس الرقم القومي:", indexError.message);
        return;
      }
      console.log("تم تجهيز جدول الموكلين بنجاح");
    });
  },
);
