const express = require("express");

const router = express.Router();

const paymentsController = require("../controllers/payments.controller");

router.post("/", paymentsController.createPayment);

router.get("/case/:id", paymentsController.getCasePayments);

router.delete("/:id", paymentsController.deletePayment);

module.exports = router;
