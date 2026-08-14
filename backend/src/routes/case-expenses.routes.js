const express = require("express");

const router = express.Router();
const caseExpensesController = require("../controllers/case-expenses.controller");
const auth = require("../middlewares/auth.middleware");
const financial = require("../middlewares/financial.middleware");

router.use(auth, financial);

router.get("/case/:id", caseExpensesController.getCaseExpenses);
router.post("/", caseExpensesController.createExpense);
router.delete("/:id", caseExpensesController.deleteExpense);

module.exports = router;
