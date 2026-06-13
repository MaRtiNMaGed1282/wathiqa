const mysql = require("mysql2");

/**
 * Create MySQL connection
 */
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "442001@Mm",          
  database: "lawyer_case_management"
});

/**
 * Connect to database
 */
db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  }
  console.log("MySQL Database Connected");
});

module.exports = db;
