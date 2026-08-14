const express = require("express");

const router = express.Router();
const expensesController = require("../controllers/expenses.controller");
const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");

const financial = authorize("admin", "lawyer");

router.get("/service/:id", auth, financial, expensesController.getServiceExpenses);
router.post("/", auth, financial, expensesController.createExpense);
router.delete("/:id", auth, financial, expensesController.deleteExpense);

module.exports = router;
