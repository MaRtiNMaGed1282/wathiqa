const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const financial = require("../middlewares/financial.middleware");
const pdfController = require("../controllers/pdf.controller");

router.use(auth);

router.get("/client/:id", pdfController.client);
router.get("/case/:id", pdfController.case);
router.get("/service/:id", pdfController.service);
router.get("/reports", pdfController.reports);
router.get("/financial", financial, pdfController.financial);

module.exports = router;
