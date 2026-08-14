const logActivity = require("../utils/activityLogger");
const { createNotification } = require("../utils/notificationService");
const db = require("../config/sqlite");
const { isEmpty, isValidMoney } = require("../utils/validation");

function validateDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

exports.createPayment = (req, res) => {
  const { case_id, service_id, amount, payment_date, payment_method, notes } = req.body;
  const hasCase = !isEmpty(case_id);
  const hasService = !isEmpty(service_id);

  if (!hasCase && !hasService) {
    return res.status(400).json({ message: "case_id or service_id is required" });
  }

  if (isEmpty(amount) || isEmpty(payment_date) || isEmpty(payment_method)) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (!isValidMoney(amount) || Number(amount) <= 0) {
    return res.status(400).json({ message: "Invalid amount" });
  }

  if (!validateDate(payment_date)) {
    return res.status(400).json({ message: "Invalid payment_date" });
  }

  const verifyQuery = hasService
    ? "SELECT service_id FROM legal_services WHERE service_id = ?"
    : "SELECT case_id FROM legal_cases WHERE case_id = ?";
  const verifyId = hasService ? service_id : case_id;

  db.get(verifyQuery, [verifyId], (verifyErr, record) => {
    if (verifyErr) return res.status(500).json({ message: verifyErr.message });
    if (!record) {
      return res.status(404).json({
        message: hasService ? "Service not found" : "Case not found",
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
      [hasCase ? case_id : null, hasService ? service_id : null, Number(amount), payment_date, payment_method, notes || null],
      function (err) {
        if (err) return res.status(500).json({ message: err.message });

        const paymentId = this.lastID;
        logActivity({
          module: "payment",
          record_id: paymentId,
          action: "created",
          description: "تم تسجيل دفعة جديدة",
          user_id: req.user.id,
        });

        createNotification({
          title: "Payment received",
          message: `A payment of ${amount} was received for ${hasService ? `service ${service_id}` : `case ${case_id}`}`,
          type: "info",
          module: "payment",
          record_id: paymentId,
          user_id: req.user.id,
        }).catch((notificationErr) => {
          console.error("Notification error:", notificationErr.message);
        });

        res.status(201).json({
          message: "تم تسجيل الدفعة بنجاح",
          payment_id: paymentId,
        });
      },
    );
  });
};

exports.getCasePayments = (req, res) => {
  const { id } = req.params;

  db.all(
    `SELECT * FROM payments WHERE case_id = ? ORDER BY payment_date DESC, payment_id DESC`,
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(rows);
    },
  );
};

exports.getServicePayments = (req, res) => {
  const { id } = req.params;

  db.all(
    `SELECT * FROM payments WHERE service_id = ? ORDER BY payment_date DESC, payment_id DESC`,
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(rows);
    },
  );
};

exports.deletePayment = (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM payments WHERE payment_id = ?", [id], function (err) {
    if (err) return res.status(500).json({ message: err.message });
    if (this.changes === 0) return res.status(404).json({ message: "Payment not found" });

    logActivity({
      module: "payment",
      record_id: Number(id),
      action: "deleted",
      description: "تم حذف الدفعة",
      user_id: req.user.id,
    });

    res.json({ message: "تم حذف الدفعة بنجاح" });
  });
};
