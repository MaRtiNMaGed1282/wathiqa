const db = require("../config/sqlite");
const logActivity = require("../utils/activityLogger");
const { createNotification } = require("../utils/notificationService");
const {
  isEmpty,
  isValidMoney,
  isValidIntegerId,
  isValidDate,
  isDateOnOrAfter,
} = require("../utils/validation");

function validateServiceDates({ start_date, due_date, completed_date, service_status }) {
  if (!isValidDate(start_date) || !isValidDate(due_date)) {
    return "Invalid start_date or due_date";
  }

  if (!isDateOnOrAfter(due_date, start_date)) {
    return "due_date cannot be earlier than start_date";
  }

  const completed = service_status === "completed";

  if (completed && isEmpty(completed_date)) {
    return "completed_date is required when service_status is completed";
  }

  if (!completed && !isEmpty(completed_date)) {
    return "completed_date is allowed only when service_status is completed";
  }

  if (!isEmpty(completed_date)) {
    if (!isValidDate(completed_date)) return "Invalid completed_date";
    if (!isDateOnOrAfter(completed_date, start_date)) {
      return "completed_date cannot be earlier than start_date";
    }
  }

  return null;
}

exports.getAllServices = (req, res) => {
  db.all(
    `
    SELECT legal_services.*, clients.full_name
    FROM legal_services
    LEFT JOIN clients ON legal_services.client_id = clients.id
    ORDER BY legal_services.created_at DESC
    `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(rows);
    },
  );
};

exports.getServiceById = (req, res) => {
  const { id } = req.params;
  if (!isValidIntegerId(id)) return res.status(400).json({ message: "Invalid service ID" });

  db.get(
    `SELECT legal_services.*, clients.full_name FROM legal_services
     LEFT JOIN clients ON legal_services.client_id = clients.id
     WHERE legal_services.service_id = ?`,
    [id],
    (err, row) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!row) return res.status(404).json({ message: "Service not found" });
      res.json(row);
    },
  );
};

exports.createService = (req, res) => {
  const {
    client_id,
    service_type,
    service_title,
    description,
    service_status,
    total_fees,
    start_date,
    due_date,
    completed_date,
    assigned_to,
    notes,
    priority_level,
  } = req.body;

  if ([client_id, service_type, service_title, service_status, start_date, due_date].some(isEmpty)) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (!isValidIntegerId(client_id)) return res.status(400).json({ message: "Invalid client_id" });
  if (!isValidMoney(total_fees)) return res.status(400).json({ message: "Invalid total_fees" });

  const dateError = validateServiceDates({ start_date, due_date, completed_date, service_status });
  if (dateError) return res.status(400).json({ message: dateError });

  db.get(`SELECT id FROM clients WHERE id = ?`, [client_id], (clientErr, client) => {
    if (clientErr) return res.status(500).json({ message: clientErr.message });
    if (!client) return res.status(400).json({ message: "Client not found" });

    db.get(`SELECT COUNT(*) AS total FROM legal_services`, [], (err, row) => {
      if (err) return res.status(500).json({ message: err.message });

      const serviceNumber = "SRV-" + String(row.total + 1).padStart(5, "0");

      db.run(
        `INSERT INTO legal_services
        (client_id, service_number, service_type, service_title, description,
         service_status, total_fees, start_date, due_date, completed_date,
         assigned_to, notes, priority_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [client_id, serviceNumber, service_type, service_title, description,
          service_status, total_fees, start_date, due_date, completed_date,
          assigned_to, notes, priority_level],
        function (err) {
          if (err) return res.status(500).json({ message: err.message });

          const serviceId = this.lastID;
          logActivity({ module: "service", record_id: serviceId, action: "created", description: "تم إنشاء الخدمة", user_id: req.user.id });
          createNotification({
            title: "Service created",
            message: `A new service was created: ${service_title}`,
            type: "info", module: "service", record_id: serviceId, user_id: req.user.id,
          }).catch((notificationError) => console.error("Notification error:", notificationError.message));

          res.status(201).json({ message: "Service created successfully", service_id: serviceId, service_number: serviceNumber });
        },
      );
    });
  });
};

exports.updateService = (req, res) => {
  const { id } = req.params;
  if (!isValidIntegerId(id)) return res.status(400).json({ message: "Invalid service ID" });

  const {
    service_title, service_type, assigned_to, start_date, due_date,
    service_status, priority_level, total_fees, description, notes, completed_date,
  } = req.body;

  if ([service_title, service_type, start_date, due_date, service_status].some(isEmpty)) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  if (!isValidMoney(total_fees)) return res.status(400).json({ message: "Invalid total_fees" });

  const dateError = validateServiceDates({ start_date, due_date, completed_date, service_status });
  if (dateError) return res.status(400).json({ message: dateError });

  db.run(
    `UPDATE legal_services SET service_title = ?, service_type = ?, assigned_to = ?,
      start_date = ?, due_date = ?, service_status = ?, priority_level = ?,
      total_fees = ?, description = ?, completed_date = ?, notes = ?
     WHERE service_id = ?`,
    [service_title, service_type, assigned_to, start_date, due_date, service_status,
      priority_level, total_fees, description, completed_date, notes, id],
    function (err) {
      if (err) return res.status(500).json({ message: err.message });
      if (this.changes === 0) return res.status(404).json({ message: "Service not found" });

      logActivity({ module: "service", record_id: Number(id), action: "updated", description: "تم تعديل الخدمة", user_id: req.user.id });
      res.json({ message: "Service updated successfully" });
    },
  );
};

exports.deleteService = (req, res) => {
  const { id } = req.params;
  if (!isValidIntegerId(id)) return res.status(400).json({ message: "Invalid service ID" });

  db.run(`DELETE FROM legal_services WHERE service_id = ?`, [id], function (err) {
    if (err) return res.status(500).json({ message: err.message });
    if (this.changes === 0) return res.status(404).json({ message: "Service not found" });

    logActivity({ module: "service", record_id: Number(id), action: "deleted", description: "تم حذف الخدمة", user_id: req.user.id });
    res.json({ message: "تم حذف الخدمة بنجاح" });
  });
};

exports.getClientServices = (req, res) => {
  const { id } = req.params;
  if (!isValidIntegerId(id)) return res.status(400).json({ message: "Invalid client ID" });

  db.all(
    `SELECT service_id, service_title, service_type, service_status, total_fees, start_date, due_date
     FROM legal_services WHERE client_id = ? ORDER BY service_id DESC`,
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(rows);
    },
  );
};
