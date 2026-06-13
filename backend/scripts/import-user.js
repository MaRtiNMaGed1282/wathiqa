const db = require("./src/config/sqlite");

db.run(
  `
  INSERT INTO users
  (
    id,
    full_name,
    email,
    password_hash,
    role,
    must_change_password
  )
  VALUES
  (
    ?,
    ?,
    ?,
    ?,
    ?,
    ?
  )
`,
  [
    1,
    "Administrator",
    "admin@gmail.com",

    // IMPORTANT:
    // replace with actual hash from MySQL
    "$2b$10$Iy8Zp3k7dENAPaztXb3KJetOvvBNpB4ZZAHSbZEXQiSoSW8VrvNGS",

    "admin",
    1,
  ],
  (err) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log("User imported successfully");
  },
);
