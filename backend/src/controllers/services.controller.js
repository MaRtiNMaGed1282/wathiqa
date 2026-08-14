const db = require("../config/sqlite");
const logActivity = require("../utils/activityLogger");
const { createNotification } = require("../utils/notificationService");
const { isEmpty, isValidMoney } = require("../utils/validation");

const REQUIRED_FIELDS = ["client_id", "service_type", "service_title", "service_status", "start_date", "due_date"];
const COMPLETED_STATUS = "مكتملة";

function validateDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function validateServicePayload(body, { allowFees = true } = {}) {
  for (const field of REQUIRED_FIELDS) {
    if (isEmpty(body[field])) return `Missing required field: ${field}`;
  }
  if (!validateDate(body.start_date) || !validateDate(body.due_date)) return "Invalid service date";
  if (body.due_date < body.start_date) return "due_date cannot be earlier than start_date";
  if (allowFees && !isValidMoney(body.total_fees ?? 0)) return "Invalid total_fees";
  if (body.completed_date && !validateDate(body.completed_date)) return "Invalid completed_date";
  if (body.service_status === COMPLETED_STATUS && !body.completed_date) return "completed_date is required when service is completed";
  if (body.service_status !== COMPLETED_STATUS && body.completed_date) return "completed_date must be empty unless service is completed";
  return null;
}

function serviceSelect() {
  return `SELECT legal_services.*, clients.full_name FROM legal_services LEFT JOIN clients ON legal_services.client_id = clients.id`;
}

function getNextServiceNumber(callback) {
  db.get(`SELECT COALESCE(MAX(CAST(SUBSTR(service_number, 5) AS INTEGER)), 0) AS max_number FROM legal_services WHERE service_number LIKE 'SRV-%'`, [], (err, row) => {
    if (err) return callback(err);
    callback(null, `SRV-${String(Number(row?.max_number || 0) + 1).padStart(5, "0")}`);
  });
}

exports.getServiceStats = (req, res) => {
  db.get(`
    SELECT COUNT(*) AS total_services,
      SUM(CASE WHEN service_status IN ('جديدة','قيد التنفيذ','بانتظار العميل') THEN 1 ELSE 0 END) AS active_services,
      SUM(CASE WHEN service_status = ? THEN 1 ELSE 0 END) AS completed_services,
      SUM(CASE WHEN due_date < date('now') AND service_status NOT IN (?, 'ملغاة') THEN 1 ELSE 0 END) AS overdue_services
    FROM legal_services
  `, [COMPLETED_STATUS, COMPLETED_STATUS], (err, row) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({
      total_services: Number(row?.total_services || 0),
      active_services: Number(row?.active_services || 0),
      completed_services: Number(row?.completed_services || 0),
      overdue_services: Number(row?.overdue_services || 0),
    });
  });
};

exports.getAllServices = (req, res) => {
  db.all(`${serviceSelect()} ORDER BY legal_services.created_at DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ message: "Failed to fetch services", error: err.message });
    res.json(rows);
  });
};

exports.searchServices = (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return exports.getAllServices(req, res);
  const search = `%${q}%`;
  db.all(`${serviceSelect()} WHERE legal_services.service_number LIKE ? OR legal_services.service_title LIKE ? OR legal_services.service_type LIKE ? OR legal_services.assigned_to LIKE ? OR clients.full_name LIKE ? ORDER BY legal_services.created_at DESC`, [search, search, search, search, search], (err, rows) => {
    if (err) return res.status(500).json({ message: "Search failed", error: err.message });
    res.json(rows);
  });
};

exports.filterServices = (req, res) => {
  const { status, type, priority, assignedTo, fromDate, toDate } = req.query;
  if (fromDate && toDate && fromDate > toDate) return res.status(400).json({ message: "fromDate cannot be later than toDate" });
  let query = `${serviceSelect()} WHERE 1 = 1`;
  const params = [];
  if (status) { query += " AND legal_services.service_status = ?"; params.push(status); }
  if (type) { query += " AND legal_services.service_type = ?"; params.push(type); }
  if (priority) { query += " AND legal_services.priority_level = ?"; params.push(priority); }
  if (assignedTo) { query += " AND legal_services.assigned_to = ?"; params.push(assignedTo); }
  if (fromDate) { query += " AND legal_services.start_date >= ?"; params.push(fromDate); }
  if (toDate) { query += " AND legal_services.due_date <= ?"; params.push(toDate); }
  query += " ORDER BY legal_services.created_at DESC";
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows);
  });
};

exports.getServiceById = (req, res) => {
  db.get(`${serviceSelect()} WHERE legal_services.service_id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!row) return res.status(404).json({ message: "Service not found" });
    res.json(row);
  });
};

exports.createService = (req, res) => {
  const isAssistant = req.user?.role === "assistant";
  const validationError = validateServicePayload(req.body, { allowFees: !isAssistant });
  if (validationError) return res.status(400).json({ message: validationError });
  const { client_id, service_type, service_title, description, service_status, total_fees, start_date, due_date, completed_date, assigned_to, notes, priority_level } = req.body;

  db.get("SELECT id FROM clients WHERE id = ?", [client_id], (clientErr, client) => {
    if (clientErr) return res.status(500).json({ message: clientErr.message });
    if (!client) return res.status(400).json({ message: "Client not found" });
    getNextServiceNumber((numberErr, serviceNumber) => {
      if (numberErr) return res.status(500).json({ message: numberErr.message });
      db.run(`INSERT INTO legal_services (client_id, service_number, service_type, service_title, description, service_status, total_fees, start_date, due_date, completed_date, assigned_to, notes, priority_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [client_id, serviceNumber, service_type, service_title, description || null, service_status, isAssistant ? 0 : Number(total_fees || 0), start_date, due_date, completed_date || null, assigned_to || null, notes || null, priority_level || null], function (err) {
        if (err) return res.status(500).json({ message: "Failed to create service", error: err.message });
        const serviceId = this.lastID;
        logActivity({ module: "service", record_id: serviceId, action: "created", description: "تم إنشاء الخدمة", user_id: req.user.id });
        createNotification({ title: "Service created", message: `A new service was created: ${service_title}`, type: "info", module: "service", record_id: serviceId, user_id: req.user.id }).catch((err) => console.error("Notification error:", err.message));
        res.status(201).json({ message: "Service created successfully", service_id: serviceId, service_number: serviceNumber });
      });
    });
  });
};

exports.updateService = (req, res) => {
  const isAssistant = req.user?.role === "assistant";
  const validationError = validateServicePayload(req.body, { allowFees: !isAssistant });
  if (validationError) return res.status(400).json({ message: validationError });
  const { client_id, service_title, service_type, assigned_to, start_date, due_date, service_status, priority_level, total_fees, description, notes, completed_date } = req.body;

  db.get("SELECT id FROM clients WHERE id = ?", [client_id], (clientErr, client) => {
    if (clientErr) return res.status(500).json({ message: clientErr.message });
    if (!client) return res.status(400).json({ message: "Client not found" });
    const feeClause = isAssistant ? "" : ", total_fees = ?";
    const params = [service_title, service_type, assigned_to || null, start_date, due_date, service_status, priority_level || null, description || null, completed_date || null, notes || null];
    if (!isAssistant) params.push(Number(total_fees || 0));
    params.push(req.params.id);
    db.run(`UPDATE legal_services SET service_title = ?, service_type = ?, assigned_to = ?, start_date = ?, due_date = ?, service_status = ?, priority_level = ?, description = ?, completed_date = ?, notes = ?${feeClause} WHERE service_id = ?`, params, function (err) {
      if (err) return res.status(500).json({ message: "Failed to update service", error: err.message });
      if (this.changes === 0) return res.status(404).json({ message: "Service not found" });
      logActivity({ module: "service", record_id: Number(req.params.id), action: "updated", description: "تم تعديل الخدمة", user_id: req.user.id });
      res.json({ message: "Service updated successfully" });
    });
  });
};

exports.deleteService = (req, res) => {
  db.run("DELETE FROM legal_services WHERE service_id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ message: "Failed to delete service", error: err.message });
    if (this.changes === 0) return res.status(404).json({ message: "Service not found" });
    logActivity({ module: "service", record_id: Number(req.params.id), action: "deleted", description: "تم حذف الخدمة", user_id: req.user.id });
    res.json({ message: "تم حذف الخدمة بنجاح" });
  });
};

exports.getClientServices = (req, res) => {
  db.all(`SELECT service_id, service_number, service_title, service_type, service_status, total_fees, start_date, due_date, completed_date, assigned_to, priority_level FROM legal_services WHERE client_id = ? ORDER BY service_id DESC`, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows);
  });
};
