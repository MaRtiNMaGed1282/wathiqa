const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const { execFileSync } = require("child_process");

const privateKey = fs.readFileSync(path.join(__dirname, "private.pem"), "utf8");

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

  if (!material) throw new Error("Unable to determine a stable machine identity");

  return crypto.createHash("sha256").update(material, "utf8").digest("hex");
}

function generateLicense(officeName) {
  const machine_id = getMachineFingerprint();

  const payload = JSON.stringify({
    office: officeName,
    type: "LIFETIME",
    machine_id,
    issued_at: new Date().toISOString(),
  });

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(payload);
  signer.end();

  const signature = signer.sign(privateKey, "base64");

  return {
    payload,
    signature,
  };
}

const office = process.argv.slice(2).join(" ").trim();

if (!office) {
  console.error("Usage: node license-generator.js \"Office Name\"");
  process.exit(1);
}

try {
  const license = generateLicense(office);
  const outputPath = path.join(__dirname, `${office.replace(/\s+/g, "_")}.lic`);

  fs.writeFileSync(outputPath, JSON.stringify(license, null, 2));

  console.log(`License generated for this PC: ${outputPath}`);
  console.log(`Machine ID: ${JSON.parse(license.payload).machine_id}`);
} catch (error) {
  console.error(`License generation failed: ${error.message}`);
  process.exit(1);
}
