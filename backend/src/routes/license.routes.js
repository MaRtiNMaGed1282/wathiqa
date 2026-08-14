const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const admin = require("../middlewares/admin.middleware");
const {
  getLicense,
  validateLicense,
  activateLicense,
  getLicenseInfo,
} = require("../controllers/license.controller");

// Activation must remain available before login.
router.post("/activate", activateLicense);

// Existing license information is protected after authentication.
router.get("/", auth, getLicense);
router.get("/validate", auth, validateLicense);
router.get("/info", auth, getLicenseInfo);

module.exports = router;
