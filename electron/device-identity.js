const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

function getDirectory() {
  try {
    const { app } = require("electron");
    if (app && typeof app.getPath === "function") return app.getPath("userData");
  } catch (_) {}
  return path.join(os.homedir(), "Wathiqa");
}

function getPath() {
  return path.join(getDirectory(), "device-identity.json");
}

function loadIdentity() {
  const file = getPath();
  if (!fs.existsSync(file)) return null;
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!value?.deviceId || !value?.deviceToken) return null;
    return value;
  } catch (_) {
    return null;
  }
}

function saveIdentity(input) {
  if (!input?.deviceId || !input?.deviceToken) throw new Error("deviceId and deviceToken are required");
  const identity = {
    deviceId: String(input.deviceId),
    deviceToken: String(input.deviceToken),
    deviceName: String(input.deviceName || os.hostname()).slice(0, 120),
  };
  const file = getPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(identity, null, 2)}\n`, "utf8");
  return identity;
}

function createLocalIdentity() {
  return {
    deviceId: crypto.randomUUID(),
    deviceToken: crypto.randomBytes(32).toString("base64url"),
    deviceName: os.hostname(),
  };
}

module.exports = { getPath, loadIdentity, saveIdentity, createLocalIdentity };
