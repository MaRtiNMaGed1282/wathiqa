const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

const JWT_SECRET = process.env.JWT_SECRET || "wathiqa_super_secret_key_2026";

module.exports = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET,
  LICENSE_SECRET: process.env.LICENSE_SECRET || "wathiqa_license_secret",
};
