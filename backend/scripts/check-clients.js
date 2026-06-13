const db = require("./src/config/sqlite");

db.all(
  `
  SELECT
    id,
    full_name
  FROM clients
  `,
  [],
  (err, rows) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log(rows);
  },
);
