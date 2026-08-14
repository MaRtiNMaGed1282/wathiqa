const express = require("express");
const router = express.Router();
const caseExpensesController = require("../controllers/case-expenses.controller");
const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");

const financial = authorize("admin", "lawyer");

router.get("/case/:id", auth, financial, caseExpensesController.getCaseExpenses);
router.post("/", auth, financial, caseExpensesController.createExpense);
router.delete("/:id", auth, financial, caseExpensesController.deleteExpense);

module.exports = router;
