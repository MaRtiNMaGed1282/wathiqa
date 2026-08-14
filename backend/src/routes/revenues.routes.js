const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const financial = require("../middlewares/financial.middleware");
const revenuesController = require("../controllers/revenues.controller");

router.use(auth, financial);

router.get("/summary", revenuesController.getSummary);
router.get("/clients", revenuesController.getClientReceivables);
router.get("/top-debtors", revenuesController.getTopDebtors);
router.get("/recent-payments", revenuesController.getRecentPayments);

module.exports = router;
