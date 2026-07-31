const logActivity = require("../utils/activityLogger");
const { createNotification } = require("../utils/notificationService");
const db = require("../config/sqlite");
const { isEmpty, isValidMoney } = require("../utils/validation");

/**
 * Create Case
 */
exports.createCase = (req, res) => {
  const {
    court_case_number,
    client_id,
    total_fees,
    case_title,
    case_type,
    court_name,
    court_chamber,
    opponent_name,
    opponent_lawyer,
    opened_at,
    closed_at,
    case_status,
    priority_level,
    case_description,
    final_result,
  } = req.body;

  db.run(
    `
    INSERT INTO legal_cases (
      court_case_number,
      client_id,
      total_fees,
      case_title,
      case_type,
      court_name,
      court_chamber,
      opponent_name,
      opponent_lawyer,
      opened_at,
      closed_at,
      case_status,
      priority_level,
      case_description,
      final_result
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      court_case_number,
      client_id,
      total_fees,
      case_title,
      case_type,
      court_name,
      court_chamber,
      opponent_name,
      opponent_lawyer,
      opened_at,
      closed_at,
      case_status,
      priority_level,
      case_description,
      final_result,
    ],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: "Failed to create case",
          error: err.message,
        });
      }

      const caseId = this.lastID;

      logActivity({
        module: "case",
        record_id: caseId,
        action: "created",
        description: "تم إنشاء القضية",
        user_id: req.user.id,
      });

      createNotification({
        title: "Case created",
        message: `A new case was created${case_title ? `: ${case_title}` : ""}`,
        type: "info",
        module: "case",
        record_id: caseId,
        user_id: req.user.id,
      }).catch((err) => {
        console.error("Notification error:", err.message);
      });

      if (!req.files || req.files.length === 0) {
        return res.status(201).json({
          message: "Case created successfully",
          case_id: caseId,
        });
      }

      let remaining = req.files.length;

      req.files.forEach((file) => {
        db.run(
          `
    INSERT INTO case_files (
      case_id,
      file_name,
      original_name,
      file_path
    )
    VALUES (?, ?, ?, ?)
    `,
          [
            caseId,
            file.filename,
            file.originalname,
            `uploads/${file.filename}`,
          ],
          (fileErr) => {
            if (fileErr) {
              console.error(fileErr);
            }

            remaining--;

            if (remaining === 0) {
              res.status(201).json({
                message: "Case created successfully",
                case_id: caseId,
              });
            }
          },
        );
      });
    },
  );
};
/**
 * Get All Cases
 */
exports.getAllCases = (req, res) => {
  db.all(
    `
    SELECT
      legal_cases.*,
      clients.full_name
    FROM legal_cases
    LEFT JOIN clients
      ON legal_cases.client_id = clients.id
    ORDER BY legal_cases.created_at DESC
    `,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          message: "Failed to fetch cases",
          error: err.message,
        });
      }

      res.json(rows);
    },
  );
};
/**
 * Get Case By ID
 */
exports.getCaseById = (req, res) => {
  const { id } = req.params;

  db.get(
    `
    SELECT
      legal_cases.*,
      clients.full_name
    FROM legal_cases
    LEFT JOIN clients
      ON legal_cases.client_id = clients.id
    WHERE case_id = ?
    `,
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          message: "Failed to fetch case",
          error: err.message,
        });
      }

      if (!row) {
        return res.status(404).json({
          message: "Case not found",
        });
      }

      res.json(row);
    },
  );
};

/**
 * Search Cases
 */
exports.searchCases = (req, res) => {
  const search = `%${req.query.q || ""}%`;

  db.all(
    `
    SELECT
      legal_cases.*,
      clients.full_name
    FROM legal_cases
    LEFT JOIN clients
      ON legal_cases.client_id = clients.id
    WHERE court_case_number LIKE ?
    ORDER BY legal_cases.created_at DESC
    `,
    [search],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          message: "Search failed",
          error: err.message,
        });
      }

      res.json(rows);
    },
  );
};

/**
 * Update Case
 */
exports.updateCase = (req, res) => {
  const { id } = req.params;

  const {
    court_case_number,
    client_id,
    total_fees,
    case_title,
    case_type,
    court_name,
    court_chamber,
    opponent_name,
    opponent_lawyer,
    opened_at,
    closed_at,
    case_status,
    priority_level,
    case_description,
    final_result,
  } = req.body;

  if (
    isEmpty(court_case_number) ||
    isEmpty(client_id) ||
    isEmpty(case_title) ||
    isEmpty(case_type) ||
    isEmpty(opened_at) ||
    isEmpty(case_status)
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

  if (opened_at && closed_at && new Date(closed_at) < new Date(opened_at)) {
    return res.status(400).json({
      message: "closed_at cannot be earlier than opened_at",
    });
  }

  db.run(
    `
    UPDATE legal_cases
    SET
      court_case_number = ?,
      client_id = ?,
      total_fees = ?,
      case_title = ?,
      case_type = ?,
      court_name = ?,
      court_chamber = ?,
      opponent_name = ?,
      opponent_lawyer = ?,
      opened_at = ?,
      closed_at = ?,
      case_status = ?,
      priority_level = ?,
      case_description = ?,
      final_result = ?
    WHERE case_id = ?
    `,
    [
      court_case_number,
      client_id,
      total_fees,
      case_title,
      case_type,
      court_name,
      court_chamber,
      opponent_name,
      opponent_lawyer,
      opened_at,
      closed_at,
      case_status,
      priority_level,
      case_description,
      final_result,
      id,
    ],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: "Failed to update case",
          error: err.message,
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          message: "Case not found",
        });
      }

      logActivity({
        module: "case",
        record_id: Number(id),
        action: "updated",
        description: "تم تعديل بيانات القضية",
        user_id: req.user.id,
      });

      res.json({
        message: "Case updated successfully",
      });
    },
  );
};

exports.deleteCase = (req, res) => {
  const { id } = req.params;

  db.run(
    `
    DELETE FROM legal_cases
    WHERE case_id = ?
    `,
    [id],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: "Failed to delete case",
          error: err.message,
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          message: "Case not found",
        });
      }
      logActivity({
        module: "case",
        record_id: Number(id),
        action: "deleted",
        description: "تم حذف القضية",
        user_id: req.user.id,
      });
      res.json({
        message: "Case deleted successfully",
      });
    },
  );
};

exports.filterCases = (req, res) => {
  const { fromDate, toDate, caseType, court, chamber } = req.query;

  let query = `
    SELECT
      legal_cases.*,
      clients.full_name
    FROM legal_cases
    LEFT JOIN clients
      ON legal_cases.client_id = clients.id
    WHERE 1=1
  `;

  const params = [];

  if (fromDate) {
    query += `
      AND opened_at >= ?
    `;

    params.push(fromDate);
  }

  if (toDate) {
    query += `
      AND opened_at <= ?
    `;

    params.push(toDate);
  }

  if (caseType) {
    query += `
      AND case_type = ?
    `;

    params.push(caseType);
  }

  if (court) {
    query += `
      AND court_name = ?
    `;

    params.push(court);
  }

  if (chamber) {
    query += `
      AND court_chamber = ?
    `;

    params.push(chamber);
  }

  query += `
    ORDER BY created_at DESC
  `;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({
        message: err.message,
      });
    }

    res.json(rows);
  });
};

exports.getRecentCases = (req, res) => {
  db.all(
    `
    SELECT
      case_id,
      case_title,
      court_case_number,
      case_status,
      created_at
    FROM legal_cases
    ORDER BY created_at DESC
    LIMIT 5
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
exports.globalSearch = (req, res) => {
  const search = `%${req.query.q || ""}%`;

  db.all(
    `
    SELECT
      'case' AS type,
      case_id AS id,
      case_title AS title,
      court_case_number AS subtitle
    FROM legal_cases
    WHERE
      case_title LIKE ?
      OR court_case_number LIKE ?

    UNION

    SELECT
      'client' AS type,
      id,
      full_name AS title,
      phone AS subtitle
    FROM clients
    WHERE
      full_name LIKE ?
      OR phone LIKE ?
      OR national_id LIKE ?
    `,
    [search, search, search, search, search],
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
