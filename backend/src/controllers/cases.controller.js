const logActivity = require("../utils/activityLogger");
const { createNotification } = require("../utils/notificationService");
const db = require("../config/sqlite");
const { isEmpty, isValidMoney } = require("../utils/validation");

const REQUIRED_CASE_FIELDS = [
  "court_case_number",
  "client_id",
  "case_title",
  "case_type",
  "opened_at",
  "case_status",
];

function validateCasePayload(body) {
  for (const field of REQUIRED_CASE_FIELDS) {
    if (isEmpty(body[field])) return `Missing required field: ${field}`;
  }

  if (!isValidMoney(body.total_fees ?? 0)) return "Invalid total_fees";

  if (body.closed_at && new Date(body.closed_at) < new Date(body.opened_at)) {
    return "closed_at cannot be earlier than opened_at";
  }

  return null;
}

function caseSelect() {
  return `
    SELECT legal_cases.*, clients.full_name
    FROM legal_cases
    LEFT JOIN clients ON legal_cases.client_id = clients.id
  `;
}

exports.createCase = (req, res) => {
  const validationError = validateCasePayload(req.body);
  if (validationError) return res.status(400).json({ message: validationError });

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

  db.get("SELECT id FROM clients WHERE id = ?", [client_id], (clientErr, client) => {
    if (clientErr) return res.status(500).json({ message: clientErr.message });
    if (!client) return res.status(400).json({ message: "Client not found" });

    db.run(
      `
      INSERT INTO legal_cases (
        court_case_number, client_id, total_fees, case_title, case_type,
        court_name, court_chamber, opponent_name, opponent_lawyer,
        opened_at, closed_at, case_status, priority_level,
        case_description, final_result
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        court_case_number,
        client_id,
        Number(total_fees || 0),
        case_title,
        case_type,
        court_name || null,
        court_chamber || null,
        opponent_name || null,
        opponent_lawyer || null,
        opened_at,
        closed_at || null,
        case_status,
        priority_level || null,
        case_description || null,
        final_result || null,
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
        }).catch((err) => console.error("Notification error:", err.message));

        if (!req.files || req.files.length === 0) {
          return res.status(201).json({
            message: "Case created successfully",
            case_id: caseId,
          });
        }

        let remaining = req.files.length;
        let fileErrors = 0;

        req.files.forEach((file) => {
          db.run(
            `
            INSERT INTO case_files (case_id, file_name, original_name, file_path)
            VALUES (?, ?, ?, ?)
            `,
            [caseId, file.filename, file.originalname, `uploads/${file.filename}`],
            (fileErr) => {
              if (fileErr) {
                fileErrors += 1;
                console.error(fileErr);
              }

              remaining -= 1;
              if (remaining === 0) {
                res.status(201).json({
                  message:
                    fileErrors > 0
                      ? "Case created, but some files could not be saved"
                      : "Case created successfully",
                  case_id: caseId,
                  file_errors: fileErrors,
                });
              }
            },
          );
        });
      },
    );
  });
};

exports.getAllCases = (req, res) => {
  db.all(`${caseSelect()} ORDER BY legal_cases.created_at DESC`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({
        message: "Failed to fetch cases",
        error: err.message,
      });
    }
    res.json(rows);
  });
};

exports.getCaseById = (req, res) => {
  db.get(`${caseSelect()} WHERE legal_cases.case_id = ?`, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({
        message: "Failed to fetch case",
        error: err.message,
      });
    }
    if (!row) return res.status(404).json({ message: "Case not found" });
    res.json(row);
  });
};

function performCaseSearch(req, res) {
  const q = String(req.query.q || "").trim();
  if (!q) return exports.getAllCases(req, res);

  const search = `%${q}%`;
  db.all(
    `
    ${caseSelect()}
    WHERE
      legal_cases.court_case_number LIKE ?
      OR legal_cases.case_title LIKE ?
      OR legal_cases.case_type LIKE ?
      OR legal_cases.court_name LIKE ?
      OR legal_cases.court_chamber LIKE ?
      OR legal_cases.opponent_name LIKE ?
      OR legal_cases.opponent_lawyer LIKE ?
      OR clients.full_name LIKE ?
      OR clients.national_id LIKE ?
    ORDER BY legal_cases.created_at DESC
    `,
    [search, search, search, search, search, search, search, search, search],
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
}

exports.searchCases = performCaseSearch;
exports.advancedSearch = performCaseSearch;

exports.updateCase = (req, res) => {
  const validationError = validateCasePayload(req.body);
  if (validationError) return res.status(400).json({ message: validationError });

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

  db.get("SELECT id FROM clients WHERE id = ?", [client_id], (clientErr, client) => {
    if (clientErr) return res.status(500).json({ message: clientErr.message });
    if (!client) return res.status(400).json({ message: "Client not found" });

    db.run(
      `
      UPDATE legal_cases SET
        court_case_number = ?, client_id = ?, total_fees = ?, case_title = ?,
        case_type = ?, court_name = ?, court_chamber = ?, opponent_name = ?,
        opponent_lawyer = ?, opened_at = ?, closed_at = ?, case_status = ?,
        priority_level = ?, case_description = ?, final_result = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE case_id = ?
      `,
      [
        court_case_number,
        client_id,
        Number(total_fees || 0),
        case_title,
        case_type,
        court_name || null,
        court_chamber || null,
        opponent_name || null,
        opponent_lawyer || null,
        opened_at,
        closed_at || null,
        case_status,
        priority_level || null,
        case_description || null,
        final_result || null,
        req.params.id,
      ],
      function (err) {
        if (err) {
          return res.status(500).json({
            message: "Failed to update case",
            error: err.message,
          });
        }
        if (this.changes === 0) return res.status(404).json({ message: "Case not found" });

        logActivity({
          module: "case",
          record_id: Number(req.params.id),
          action: "updated",
          description: "تم تعديل بيانات القضية",
          user_id: req.user.id,
        });

        res.json({ message: "Case updated successfully" });
      },
    );
  });
};

exports.deleteCase = (req, res) => {
  db.run("DELETE FROM legal_cases WHERE case_id = ?", [req.params.id], function (err) {
    if (err) {
      return res.status(500).json({
        message: "Failed to delete case",
        error: err.message,
      });
    }
    if (this.changes === 0) return res.status(404).json({ message: "Case not found" });

    logActivity({
      module: "case",
      record_id: Number(req.params.id),
      action: "deleted",
      description: "تم حذف القضية",
      user_id: req.user.id,
    });

    res.json({ message: "Case deleted successfully" });
  });
};

exports.filterCases = (req, res) => {
  const { fromDate, toDate, caseType, court, chamber } = req.query;

  if (fromDate && toDate && fromDate > toDate) {
    return res.status(400).json({ message: "fromDate cannot be later than toDate" });
  }

  let query = `${caseSelect()} WHERE 1 = 1`;
  const params = [];

  if (fromDate) {
    query += " AND legal_cases.opened_at >= ?";
    params.push(fromDate);
  }
  if (toDate) {
    query += " AND legal_cases.opened_at <= ?";
    params.push(toDate);
  }
  if (caseType) {
    query += " AND legal_cases.case_type = ?";
    params.push(caseType);
  }
  if (court) {
    query += " AND legal_cases.court_name = ?";
    params.push(court);
  }
  if (chamber) {
    query += " AND legal_cases.court_chamber = ?";
    params.push(chamber);
  }

  query += " ORDER BY legal_cases.created_at DESC";

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows);
  });
};

exports.getRecentCases = (req, res) => {
  db.all(
    `
    SELECT case_id, case_title, court_case_number, case_status, created_at
    FROM legal_cases
    ORDER BY created_at DESC
    LIMIT 5
    `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(rows);
    },
  );
};

exports.globalSearch = (req, res) => {
  const search = `%${req.query.q || ""}%`;

  db.all(
    `
    SELECT 'case' AS type, case_id AS id, case_title AS title, court_case_number AS subtitle
    FROM legal_cases
    WHERE case_title LIKE ? OR court_case_number LIKE ?

    UNION

    SELECT 'client' AS type, id, full_name AS title, phone AS subtitle
    FROM clients
    WHERE full_name LIKE ? OR phone LIKE ? OR national_id LIKE ?
    `,
    [search, search, search, search, search],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(rows);
    },
  );
};
