const db = require("./src/config/sqlite");

const email = "admin@gmail.com";

db.get(
  `
  SELECT *
  FROM users
  WHERE email = ?
  `,
  [email],
  (err, row) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log(row);
  },
);
