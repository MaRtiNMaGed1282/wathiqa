const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "../../../database/wathiqa.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("SQLite connection failed:", err.message);
    process.exit(1);
  }

  console.log("SQLite Database Connected");
});

module.exports = db;
