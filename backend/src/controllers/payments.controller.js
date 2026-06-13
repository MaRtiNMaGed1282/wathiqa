const db = require("../config/sqlite");

exports.createPayment = (req, res) => {
  const { case_id, amount, payment_date, payment_method, notes } = req.body;

  db.run(
    `
    INSERT INTO payments (
      case_id,
      amount,
      payment_date,
      payment_method,
      notes
    )
    VALUES (?, ?, ?, ?, ?)
    `,
    [case_id, amount, payment_date, payment_method, notes],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      res.status(201).json({
        message: "تم تسجيل الدفعة بنجاح",
        payment_id: this.lastID,
      });
    },
  );
};

exports.getCasePayments = (req, res) => {
  const { id } = req.params;

  db.all(
    `
    SELECT *
    FROM payments
    WHERE case_id = ?
    ORDER BY payment_date DESC
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

exports.deletePayment = (req, res) => {
  const { id } = req.params;

  db.run(
    `
    DELETE FROM payments
    WHERE payment_id = ?
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
          message: "Payment not found",
        });
      }

      res.json({
        message: "تم حذف الدفعة بنجاح",
      });
    },
  );
};
