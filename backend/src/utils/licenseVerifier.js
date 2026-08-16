const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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
  if (typeof payload !== "string" || typeof signature !== "string") {
    return false;
  }

  if (!verifySignature(payload, signature)) {
    return false;
  }

  try {
    const data = JSON.parse(payload);
    return Boolean(data && typeof data === "object" && data.office && data.type);
  } catch {
    return false;
  }
}

module.exports = {
  verifyLicense,
  verifySignature,
};
