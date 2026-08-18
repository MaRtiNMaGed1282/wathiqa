const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const localOnly = require("../middlewares/localOnly.middleware");
const {
  getLicense,
  validateLicense,
  activateLicense,
  getLicenseInfo,
} = require("../controllers/license.controller");

// Activation is a server-owned operation. Remote office clients may validate
// the server license, but they cannot mutate the authoritative license state.
router.post("/activate", localOnly, activateLicense);
router.get("/validate", validateLicense);

// Existing license information is protected after authentication.
router.get("/", auth, getLicense);
router.get("/info", auth, getLicenseInfo);

module.exports = router;
