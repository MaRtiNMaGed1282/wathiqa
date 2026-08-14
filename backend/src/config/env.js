const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

const requiredSecrets = ["JWT_SECRET", "LICENSE_SECRET"];

for (const name of requiredSecrets) {
  if (!process.env[name]) {
    throw new Error(`${name} must be configured in the environment`);
  }
}

module.exports = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET,
  LICENSE_SECRET: process.env.LICENSE_SECRET,
};
