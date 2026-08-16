const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const {
  getLicense,
  validateLicense,
  activateLicense,
  getLicenseInfo,
} = require("../controllers/license.controller");

// Activation and startup validation must remain available before login.
router.post("/activate", activateLicense);
router.get("/validate", validateLicense);

// Existing license information is protected after authentication.
router.get("/", auth, getLicense);
router.get("/info", auth, getLicenseInfo);

module.exports = router;
