const express = require("express");

const router = express.Router();
const expensesController = require("../controllers/expenses.controller");
const auth = require("../middlewares/auth.middleware");
const financial = require("../middlewares/financial.middleware");

router.use(auth, financial);

router.get("/service/:id", expensesController.getServiceExpenses);
router.post("/", expensesController.createExpense);
router.delete("/:id", expensesController.deleteExpense);

module.exports = router;
