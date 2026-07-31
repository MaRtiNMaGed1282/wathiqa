const express = require("express");

const router = express.Router();

const {
  getLicense,
  validateLicense,
  activateLicense,
  getLicenseInfo,
} = require("../controllers/license.controller");

router.post("/activate", activateLicense);

router.get("/", getLicense);

router.get("/validate", validateLicense);

router.get("/info", getLicenseInfo);

module.exports = router;
