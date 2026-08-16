const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

fs.writeFileSync(
  path.join(__dirname, "private.pem"),
  privateKey.export({
    type: "pkcs1",
    format: "pem",
  }),
);

fs.writeFileSync(
  path.join(__dirname, "public.pem"),
  publicKey.export({
    type: "spki",
    format: "pem",
  }),
);

console.log("Keys generated.");
