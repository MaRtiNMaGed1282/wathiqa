const logActivity = require("../utils/activityLogger");
const { createNotification } = require("../utils/notificationService");
const db = require("../config/sqlite");
const { isEmpty, isValidMoney } = require("../utils/validation");

exports.createPayment = (req, res) => {
  const { case_id, service_id, amount, payment_date, payment_method, notes } = req.body;
  const hasCase = !isEmpty(case_id); const hasService = !isEmpty(service_id);
  if ((!hasCase && !hasService) || (hasCase && hasService)) return res.status(400).json({ message: "يجب ربط الدفعة بقضية أو خدمة واحدة فقط" });
  if (isEmpty(amount) || isEmpty(payment_date) || isEmpty(payment_method)) return res.status(400).json({ message: "مبلغ الدفعة وتاريخها وطريقة الدفع مطلوبة" });
  if (!isValidMoney(amount)) return res.status(400).json({ message: "Invalid amount" });
  const parentTable = hasCase ? "legal_cases" : "legal_services"; const parentColumn = hasCase ? "case_id" : "service_id"; const parentId = hasCase ? case_id : service_id;
  db.get(`SELECT ${parentColumn} FROM ${parentTable} WHERE ${parentColumn} = ?`, [parentId], (lookupErr, parent) => {
    if (lookupErr) return res.status(500).json({ message: "فشل التحقق من السجل المرتبط بالدفعة", error: lookupErr.message });
    if (!parent) return res.status(404).json({ message: hasCase ? "القضية غير موجودة" : "الخدمة غير موجودة" });
    db.run(`INSERT INTO payments (case_id, service_id, amount, payment_date, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?)`, [hasCase ? case_id : null, hasService ? service_id : null, amount, payment_date, payment_method, notes || null], function (err) {
      if (err) return res.status(500).json({ message: err.message });
      const paymentId = this.lastID; const targetLabel = hasCase ? `case ${case_id}` : `service ${service_id}`;
      logActivity({ module: "payment", record_id: paymentId, action: "created", description: "تم تسجيل دفعة جديدة", user_id: req.user.id });
      createNotification({ title: "Payment received", message: `A payment of ${amount} was received for ${targetLabel}`, type: "info", module: "payment", record_id: paymentId, user_id: req.user.id }).catch((notificationError) => console.error("Notification error:", notificationError.message));
      return res.status(201).json({ message: "تم تسجيل الدفعة بنجاح", payment_id: paymentId });
    });
  });
};
exports.getCasePayments = (req, res) => { const { id } = req.params; db.all(`SELECT * FROM payments WHERE case_id = ? ORDER BY payment_date DESC`, [id], (err, rows) => err ? res.status(500).json({ message: err.message }) : res.json(rows)); };
exports.getServicePayments = (req, res) => { const { id } = req.params; db.all(`SELECT * FROM payments WHERE service_id = ? ORDER BY payment_date DESC`, [id], (err, rows) => err ? res.status(500).json({ message: err.message }) : res.json(rows)); };
exports.deletePayment = (req, res) => {
  const { id } = req.params;
  db.get(`SELECT payment_id, invoice_id FROM payments WHERE payment_id = ?`, [id], (lookupErr, payment) => {
    if (lookupErr) return res.status(500).json({ message: lookupErr.message });
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    db.run(`DELETE FROM payments WHERE payment_id = ?`, [id], function (err) {
      if (err) return res.status(500).json({ message: err.message });
      logActivity({ module: "payment", record_id: Number(id), action: "deleted", description: "تم حذف الدفعة", user_id: req.user.id });
      if (payment.invoice_id) db.get(`SELECT total FROM invoices WHERE invoice_id = ?`, [payment.invoice_id], (invoiceErr, invoice) => { if (!invoiceErr && invoice) db.get(`SELECT COALESCE(SUM(amount),0) AS paid FROM payments WHERE invoice_id = ?`, [payment.invoice_id], (sumErr, totals) => { if (!sumErr) { const paid = Number(totals?.paid || 0); const status = paid >= Number(invoice.total) ? "paid" : paid > 0 ? "partial" : "issued"; db.run(`UPDATE invoices SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE invoice_id = ?`, [status, payment.invoice_id]); } }); });
      res.json({ message: "تم حذف الدفعة بنجاح" });
    });
  });
};
