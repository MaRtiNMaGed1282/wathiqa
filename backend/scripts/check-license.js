const db = require("./src/config/sqlite");

db.get(
  `
  SELECT *
  FROM license
  `,
  [],
  (err, row) => {
    console.log(row);
  },
);
