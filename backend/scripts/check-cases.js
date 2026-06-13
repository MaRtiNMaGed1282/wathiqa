const db = require("./src/config/sqlite");

db.all(
  `
  PRAGMA table_info(clients)
  `,
  [],
  (err, rows) => {
    console.log(rows);
  },
);
