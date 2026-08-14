const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");
const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");

router.get("/", auth, authorize("admin", "lawyer", "assistant"), dashboardController.getDashboard);

module.exports = router;
