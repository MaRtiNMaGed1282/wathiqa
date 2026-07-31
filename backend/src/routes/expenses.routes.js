const express = require("express");

const router = express.Router();

const expensesController = require("../controllers/expenses.controller");
const auth = require("../middlewares/auth.middleware");

router.get("/service/:id", auth, expensesController.getServiceExpenses);

router.post("/", auth, expensesController.createExpense);

router.delete("/:id", auth, expensesController.deleteExpense);

module.exports = router;
