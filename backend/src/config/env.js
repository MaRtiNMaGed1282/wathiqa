const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

function getEnvCandidates() {
  const candidates = [];

  if (process.env.WATHIQA_ENV_FILE) {
    candidates.push(path.resolve(process.env.WATHIQA_ENV_FILE));
  }

  try {
    const { app } = require("electron");
    if (app?.isPackaged && process.resourcesPath) {
      candidates.push(path.join(process.resourcesPath, ".env"));
    }
  } catch {}

  candidates.push(path.resolve(process.cwd(), ".env"));
  candidates.push(path.resolve(__dirname, "../../../.env"));

  return [...new Set(candidates)];
}

const envFile = getEnvCandidates().find((candidate) => fs.existsSync(candidate));

if (envFile) {
  dotenv.config({ path: envFile });
} else {
  dotenv.config();
}

const requiredSecrets = ["JWT_SECRET", "LICENSE_SECRET"];

for (const name of requiredSecrets) {
  if (!process.env[name]) {
    throw new Error(`${name} must be configured in the environment`);
  }
}

const nodeEnv = String(process.env.NODE_ENV || "production").trim().toLowerCase();
const port = Number(process.env.PORT || 5000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port");
}

const configuredOrigins = String(process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const CORS_ORIGINS = configuredOrigins.length
  ? configuredOrigins
  : ["http://localhost:5500", "http://127.0.0.1:5500"];

module.exports = {
  NODE_ENV: nodeEnv,
  IS_PRODUCTION: nodeEnv === "production",
  PORT: port,
  JWT_SECRET: process.env.JWT_SECRET,
  LICENSE_SECRET: process.env.LICENSE_SECRET,
  CORS_ORIGINS,
  ENV_FILE: envFile || null,
};
