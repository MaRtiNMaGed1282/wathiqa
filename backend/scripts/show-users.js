const db = require("./src/config/sqlite");

db.all("SELECT * FROM users", [], (err, rows) => {
  console.log(rows);
});
