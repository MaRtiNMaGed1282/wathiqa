const express = require("express");

const router = express.Router();

const paymentsController = require("../controllers/payments.controller");

const auth = require("../middlewares/auth.middleware");

router.post("/", auth, paymentsController.createPayment);

router.get("/service/:id", auth, paymentsController.getServicePayments);

router.get("/case/:id", auth, paymentsController.getCasePayments);

router.delete("/:id", auth, paymentsController.deletePayment);

module.exports = router;
