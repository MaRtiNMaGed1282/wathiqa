const db = require("../config/sqlite");
const logActivity = require("../utils/activityLogger");
const { createNotification } = require("../utils/notificationService");
const { isEmpty, isValidMoney } = require("../utils/validation");

exports.getAllServices = (req, res) => {
  db.all(
    `
    SELECT
      legal_services.*,
      clients.full_name
    FROM legal_services
    LEFT JOIN clients
      ON legal_services.client_id = clients.id
    ORDER BY legal_services.created_at DESC
    `,
    [],
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

exports.getServiceById = (req, res) => {
  const { id } = req.params;

  db.get(
    `
    SELECT
      legal_services.*,
      clients.full_name
    FROM legal_services
    LEFT JOIN clients
      ON legal_services.client_id = clients.id
    WHERE legal_services.service_id = ?
    `,
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      if (!row) {
        return res.status(404).json({
          message: "Service not found",
        });
      }

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

  if (
    isEmpty(client_id) ||
    isEmpty(service_type) ||
    isEmpty(service_title) ||
    isEmpty(service_status) ||
    isEmpty(start_date) ||
    isEmpty(due_date)
  ) {
    return res.status(400).json({
      message: "Missing required fields",
    });
  }

  if (!isValidMoney(total_fees)) {
    return res.status(400).json({
      message: "Invalid total_fees",
    });
  }

  if (new Date(due_date) < new Date(start_date)) {
    return res.status(400).json({
      message: "due_date cannot be earlier than start_date",
    });
  }

  db.get(
    `
    SELECT COUNT(*) AS total
    FROM legal_services
    `,
    [],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      const serviceNumber = "SRV-" + String(row.total + 1).padStart(5, "0");

      db.run(
        `
        INSERT INTO legal_services (
          client_id,
          service_number,
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
          priority_level
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          client_id,
          serviceNumber,
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
        ],
        function (err) {
          if (err) {
            return res.status(500).json({
              message: err.message,
            });
          }

          const serviceId = this.lastID;

          logActivity({
            module: "service",
            record_id: serviceId,
            action: "created",
            description: "تم إنشاء الخدمة",
            user_id: req.user.id,
          });

          createNotification({
            title: "Service created",
            message: `A new service was created: ${service_title}`,
            type: "info",
            module: "service",
            record_id: serviceId,
            user_id: req.user.id,
          }).catch((err) => {
            console.error("Notification error:", err.message);
          });

          res.status(201).json({
            message: "Service created successfully",
            service_id: serviceId,
            service_number: serviceNumber,
          });
        },
      );
    },
  );
};

exports.updateService = (req, res) => {
  const { id } = req.params;

  const {
    service_title,
    service_type,
    assigned_to,
    start_date,
    due_date,
    service_status,
    priority_level,
    total_fees,
    description,
    notes,
    completed_date,
  } = req.body;

  if (
    isEmpty(service_title) ||
    isEmpty(service_type) ||
    isEmpty(start_date) ||
    isEmpty(due_date) ||
    isEmpty(service_status)
  ) {
    return res.status(400).json({
      message: "Missing required fields",
    });
  }

  if (!isValidMoney(total_fees)) {
    return res.status(400).json({
      message: "Invalid total_fees",
    });
  }

  if (new Date(due_date) < new Date(start_date)) {
    return res.status(400).json({
      message: "due_date cannot be earlier than start_date",
    });
  }

  db.run(
    `
    UPDATE legal_services
    SET
      service_title = ?,
      service_type = ?,
      assigned_to = ?,
      start_date = ?,
      due_date = ?,
      service_status = ?,
      priority_level = ?,
      total_fees = ?,
   description = ?,
   completed_date = ?,
notes = ?
    WHERE service_id = ?
    `,
    [
      service_title,
      service_type,
      assigned_to,
      start_date,
      due_date,
      service_status,
      priority_level,
      total_fees,
      description,
      completed_date,
      notes,
      id,
    ],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          message: "Service not found",
        });
      }

      logActivity({
        module: "service",
        record_id: Number(id),
        action: "updated",
        description: "تم تعديل الخدمة",
        user_id: req.user.id,
      });

      res.json({
        message: "Service updated successfully",
      });
    },
  );
};
exports.deleteService = (req, res) => {
  const { id } = req.params;

  db.run(
    `
    DELETE FROM legal_services
    WHERE service_id = ?
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
          message: "Service not found",
        });
      }

      logActivity({
        module: "service",
        record_id: Number(id),
        action: "deleted",
        description: "تم حذف الخدمة",
        user_id: req.user.id,
      });

      res.json({
        message: "تم حذف الخدمة بنجاح",
      });
    },
  );
};
exports.getClientServices = (req, res) => {
  const { id } = req.params;

  db.all(
    `
    SELECT
      service_id,
      service_title,
      service_type,
      service_status,
      total_fees,
      start_date,
      due_date
    FROM legal_services
    WHERE client_id = ?
    ORDER BY service_id DESC
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
