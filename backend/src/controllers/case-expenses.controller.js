const logActivity = require("../utils/activityLogger");
const db = require("../config/sqlite");
const { isEmpty, isValidMoney } = require("../utils/validation");

exports.getCaseExpenses = (req, res) => {
  const { id } = req.params;

  db.all(
    `
    SELECT *
    FROM case_expenses
    WHERE case_id = ?
    ORDER BY expense_date DESC
    `,
    [id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      res.json(rows);
    },
  );
};

exports.createExpense = (req, res) => {
  const { case_id, expense_type, amount, expense_date, notes } = req.body;

  if (
    isEmpty(case_id) ||
    isEmpty(expense_type) ||
    isEmpty(amount) ||
    isEmpty(expense_date)
  ) {
    return res.status(400).json({
      message: "Missing required fields",
    });
  }

  if (!isValidMoney(amount)) {
    return res.status(400).json({
      message: "Invalid amount",
    });
  }

  db.run(
    `
    INSERT INTO case_expenses (
      case_id,
      expense_type,
      amount,
      expense_date,
      notes
    )
    VALUES (?, ?, ?, ?, ?)
    `,
    [case_id, expense_type, amount, expense_date, notes],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }
      logActivity({
        module: "expense",
        record_id: this.lastID,
        action: "created",
        description: "تم تسجيل مصروف جديد",
        user_id: req.user.id,
      });
      res.status(201).json({
        message: "Expense added successfully",
        expense_id: this.lastID,
      });
    },
  );
};

exports.deleteExpense = (req, res) => {
  const { id } = req.params;

  db.run(
    `
    DELETE FROM case_expenses
    WHERE expense_id = ?
    `,
    [id],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          message: "Expense not found",
        });
      }

      logActivity({
        module: "expense",
        record_id: Number(id),
        action: "deleted",
        description: "تم حذف المصروف",
        user_id: req.user.id,
      });

      res.json({
        message: "Expense deleted successfully",
      });
    },
  );
};
