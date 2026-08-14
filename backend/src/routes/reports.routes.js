const express = require("express");

const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const financial = require("../middlewares/financial.middleware");
const reportsController = require("../controllers/reports.controller");

router.get("/operational", auth, reportsController.getOperationalReports);
router.get("/financial", auth, financial, reportsController.getFinancialReports);

module.exports = router;
