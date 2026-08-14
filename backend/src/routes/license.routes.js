const express = require("express");
const router = express.Router();

const {
  getLicense,
  validateLicense,
  activateLicense,
  getLicenseInfo,
} = require("../controllers/license.controller");
const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");

router.post("/activate", activateLicense);
router.get("/validate", validateLicense);
router.get("/", auth, authorize("admin"), getLicense);
router.get("/info", auth, authorize("admin"), getLicenseInfo);

module.exports = router;
