const express = require("express");

const router = express.Router();
const paymentsController = require("../controllers/payments.controller");
const auth = require("../middlewares/auth.middleware");
const financial = require("../middlewares/financial.middleware");

router.use(auth, financial);

router.post("/", paymentsController.createPayment);
router.get("/service/:id", paymentsController.getServicePayments);
router.get("/case/:id", paymentsController.getCasePayments);
router.delete("/:id", paymentsController.deletePayment);

module.exports = router;
