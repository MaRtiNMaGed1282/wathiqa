const os = require("os");
const fs = require("fs");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

function readWindowsMachineGuid() {
  if (process.platform !== "win32") return "";

  try {
    const output = execFileSync(
      "reg",
      ["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    const match = output.match(/MachineGuid\s+REG_SZ\s+(.+)/i);
    return match ? match[1].trim() : "";
  } catch {
    return "";
  }
}

function readLinuxMachineId() {
  if (process.platform !== "linux") return "";

  for (const file of ["/etc/machine-id", "/var/lib/dbus/machine-id"]) {
    try {
      const value = fs.readFileSync(file, "utf8").trim();
      if (value) return value;
    } catch {
      // Try the next source.
    }
  }

  return "";
}

function readMacPlatformUuid() {
  if (process.platform !== "darwin") return "";

  try {
    const output = execFileSync("ioreg", ["-rd1", "-c", "IOPlatformExpertDevice"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const match = output.match(/\"IOPlatformUUID\"\s*=\s*\"([^\"]+)\"/);
    return match ? match[1].trim() : "";
  } catch {
    return "";
  }
}

function getMachineFingerprint() {
  const material = [
    readWindowsMachineGuid(),
    readLinuxMachineId(),
    readMacPlatformUuid(),
    os.hostname(),
    os.arch(),
    os.platform(),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("|");

  if (!material) {
    throw new Error("Unable to determine a stable machine identity");
  }

  return crypto.createHash("sha256").update(material, "utf8").digest("hex");
}

module.exports = {
  getMachineFingerprint,
};
