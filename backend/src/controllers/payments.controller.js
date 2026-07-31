const logActivity = require("../utils/activityLogger");
const { createNotification } = require("../utils/notificationService");
const db = require("../config/sqlite");
const { isEmpty, isValidMoney } = require("../utils/validation");

exports.createPayment = (req, res) => {
  const { case_id, service_id, amount, payment_date, payment_method, notes } =
    req.body;

  if (
    isEmpty(case_id) ||
    isEmpty(service_id) ||
    isEmpty(amount) ||
    isEmpty(payment_date) ||
    isEmpty(payment_method)
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
INSERT INTO payments (
  case_id,
  service_id,
  amount,
  payment_date,
  payment_method,
  notes
)
VALUES (?, ?, ?, ?, ?, ?)
    `,
    [case_id, service_id, amount, payment_date, payment_method, notes],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }
      logActivity({
        module: "payment",
        record_id: this.lastID,
        action: "created",
        description: "تم تسجيل دفعة جديدة",
        user_id: req.user.id,
      });

      createNotification({
        title: "Payment received",
        message: `A payment of ${amount} was received for case ${case_id}`,
        type: "info",
        module: "payment",
        record_id: this.lastID,
        user_id: req.user.id,
      }).catch((err) => {
        console.error("Notification error:", err.message);
      });

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

      logActivity({
        module: "payment",
        record_id: Number(id),
        action: "deleted",
        description: "تم حذف الدفعة",
        user_id: req.user.id,
      });

      res.json({
        message: "تم حذف الدفعة بنجاح",
      });
    },
  );
};
exports.getServicePayments = (req, res) => {
  const { id } = req.params;

  db.all(
    `
    SELECT *
    FROM payments
    WHERE service_id = ?
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
