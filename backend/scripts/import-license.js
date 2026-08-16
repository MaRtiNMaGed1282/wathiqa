const fs = require("fs");
const path = require("path");
const db = require("../src/config/sqlite");

const licensePath = process.argv[2];

if (!licensePath) {
  console.error("Usage: node backend/scripts/import-license.js <license-file>");
  process.exit(1);
}

let license;
try {
  license = JSON.parse(fs.readFileSync(path.resolve(licensePath), "utf8"));
} catch (error) {
  console.error(`Could not read license file: ${error.message}`);
  process.exit(1);
}

if (!license?.payload || !license?.signature) {
  console.error("License file must contain payload and signature.");
  process.exit(1);
}

let payload;
try {
  payload = JSON.parse(license.payload);
} catch {
  console.error("License payload is not valid JSON.");
  process.exit(1);
}

db.run(
  `
  UPDATE license
  SET
    office_name = ?,
    license_key = NULL,
    expiry_date = NULL,
    is_active = 1,
    payload = ?,
    signature = ?
  WHERE id = 1
  `,
  [payload.office || null, license.payload, license.signature],
  function (err) {
    if (err) {
      console.error(err);
      process.exitCode = 1;
      return;
    }

    if (this.changes === 0) {
      console.error("License row with id=1 was not found.");
      process.exitCode = 1;
      return;
    }

    console.log("License imported successfully");
    db.close();
  },
);
