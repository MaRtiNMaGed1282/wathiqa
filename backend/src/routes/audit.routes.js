const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const admin = require("../middlewares/admin.middleware");
const controller = require("../controllers/audit.controller");

router.get("/", auth, admin, controller.getAudit);

module.exports = router;
