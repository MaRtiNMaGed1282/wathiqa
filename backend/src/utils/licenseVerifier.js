const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { getMachineFingerprint } = require("./machineFingerprint");

const publicKey = fs.readFileSync(
  path.join(__dirname, "../security/public.pem"),
  "utf8",
);

function verifySignature(payload, signature) {
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(payload);
  verifier.end();
  return verifier.verify(publicKey, signature, "base64");
}

function verifyLicense(payload, signature) {
  if (!verifySignature(payload, signature)) return false;

  try {
    const data = JSON.parse(payload);
    if (!data || typeof data !== "object") return false;
    if (!data.machine_id) return false;

    return data.machine_id === getMachineFingerprint();
  } catch {
    return false;
  }
}

module.exports = {
  verifyLicense,
  verifySignature,
};
