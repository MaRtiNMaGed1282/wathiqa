const db = require("./src/config/sqlite");

db.all(
  `
  SELECT name
  FROM sqlite_master
  WHERE type='table'
  `,
  [],
  (err, rows) => {
    console.log(rows);
  },
);
