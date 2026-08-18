const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const dotenv = require("dotenv");

const SECRET_FILE_NAME = "server-secrets.json";

function getUserDataDirectory() {
  try {
    const { app } = require("electron");
    if (app && typeof app.getPath === "function") return app.getPath("userData");
  } catch (_) {}
  return path.join(require("os").homedir(), "Wathiqa");
}

function getServerSecretsPath() {
  return path.join(getUserDataDirectory(), SECRET_FILE_NAME);
}

function generateSecret() {
  return crypto.randomBytes(48).toString("base64url");
}

function readEnvSecrets(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const parsed = dotenv.parse(fs.readFileSync(filePath, "utf8"));
  if (!parsed.JWT_SECRET || !parsed.LICENSE_SECRET) return null;
  return { JWT_SECRET: parsed.JWT_SECRET, LICENSE_SECRET: parsed.LICENSE_SECRET, migratedFromEnv: true };
}

function readStoredSecrets() {
  const filePath = getServerSecretsPath();
  if (!fs.existsSync(filePath)) return null;
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!parsed.JWT_SECRET || !parsed.LICENSE_SECRET) throw new Error("Stored Wathiqa server secrets are incomplete");
  return { JWT_SECRET: String(parsed.JWT_SECRET), LICENSE_SECRET: String(parsed.LICENSE_SECRET), migratedFromEnv: Boolean(parsed.migratedFromEnv) };
}

function writeStoredSecrets(secrets) {
  const filePath = getServerSecretsPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify({
    version: 1,
    JWT_SECRET: secrets.JWT_SECRET,
    LICENSE_SECRET: secrets.LICENSE_SECRET,
    createdAt: new Date().toISOString(),
    migratedFromEnv: Boolean(secrets.migratedFromEnv),
  }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(tempPath, filePath);
  try { fs.chmodSync(filePath, 0o600); } catch (_) {}
  return filePath;
}

function findLegacyEnvFile() {
  const candidates = [];
  if (process.env.WATHIQA_ENV_FILE) candidates.push(path.resolve(process.env.WATHIQA_ENV_FILE));
  try {
    const { app } = require("electron");
    if (app?.isPackaged && process.resourcesPath) candidates.push(path.join(process.resourcesPath, ".env"));
  } catch (_) {}
  candidates.push(path.resolve(process.cwd(), ".env"));
  candidates.push(path.resolve(__dirname, "../.env"));
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function ensureServerSecrets() {
  const existing = readStoredSecrets();
  if (existing) return { ...existing, path: getServerSecretsPath() };

  const legacy = readEnvSecrets(findLegacyEnvFile());
  const secrets = legacy || { JWT_SECRET: generateSecret(), LICENSE_SECRET: generateSecret(), migratedFromEnv: false };
  const storedPath = writeStoredSecrets(secrets);
  return { ...secrets, path: storedPath };
}

module.exports = { getServerSecretsPath, ensureServerSecrets };
