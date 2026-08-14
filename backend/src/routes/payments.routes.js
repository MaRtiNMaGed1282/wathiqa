const express = require("express");

const router = express.Router();
const paymentsController = require("../controllers/payments.controller");
const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");

const financial = authorize("admin", "lawyer");

router.post("/", auth, financial, paymentsController.createPayment);
router.get("/service/:id", auth, financial, paymentsController.getServicePayments);
router.get("/case/:id", auth, financial, paymentsController.getCasePayments);
router.delete("/:id", auth, financial, paymentsController.deletePayment);

module.exports = router;
