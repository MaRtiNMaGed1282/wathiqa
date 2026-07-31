const express = require("express");

const router = express.Router();

const caseExpensesController = require("../controllers/case-expenses.controller");

const auth = require("../middlewares/auth.middleware");

router.get("/case/:id", auth, caseExpensesController.getCaseExpenses);

router.post("/", auth, caseExpensesController.createExpense);

router.delete("/:id", auth, caseExpensesController.deleteExpense);

module.exports = router;
