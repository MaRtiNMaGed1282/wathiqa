const fs = require("fs");
const path = require("path");

function readPackageVersion() {
  try {
    const packagePath = path.join(__dirname, "..", "package.json");
    return JSON.parse(fs.readFileSync(packagePath, "utf8")).version;
  } catch (_) {
    return process.env.npm_package_version || "1.0.0";
  }
}

function parseVersion(value) {
  const match = String(value || "").trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function isCompatible(serverVersion, clientVersion) {
  const server = parseVersion(serverVersion);
  const client = parseVersion(clientVersion);
  if (!server || !client) return false;

  // The API/database contract is controlled by the major version.
  // Patch updates are safe; minor updates remain compatible within the same major.
  return server.major === client.major;
}

function getCompatibility(serverVersion, clientVersion) {
  if (!parseVersion(serverVersion) || !parseVersion(clientVersion)) {
    return { compatible: false, reason: "INVALID_VERSION" };
  }
  if (isCompatible(serverVersion, clientVersion)) {
    return { compatible: true, reason: "COMPATIBLE" };
  }
  return { compatible: false, reason: "MAJOR_VERSION_MISMATCH" };
}

module.exports = {
  readPackageVersion,
  parseVersion,
  isCompatible,
  getCompatibility,
};
