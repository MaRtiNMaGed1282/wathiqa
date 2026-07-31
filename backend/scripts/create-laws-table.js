const db = require("../src/config/sqlite");

db.all(
  `
  SELECT *
  FROM legal_templates
  `,
  [],
  (err, rows) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }

    console.table(rows);
    process.exit(0);
  },
);
