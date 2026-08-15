const db = require("../src/config/sqlite");

db.run('DROP TABLE IF EXISTS "test"', (err) => {
  if (err) {
    console.error(`Failed to remove test table: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  console.log('SQLite test table removed successfully.');
});
