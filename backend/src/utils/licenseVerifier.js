const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const publicKey = fs.readFileSync(
  path.join(__dirname, "../security/public.pem"),
  "utf8",
);

function verifyLicense(payload, signature) {
  const verifier = crypto.createVerify("RSA-SHA256");

  verifier.update(payload);
  verifier.end();

  return verifier.verify(publicKey, signature, "base64");
}

module.exports = {
  verifyLicense,
};
