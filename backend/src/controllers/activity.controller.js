const db = require("../config/sqlite");

function isPositiveInteger(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

function isNonNegativeInteger(value) {
  return /^\d+$/.test(String(value)) && Number(value) >= 0;
}

function validatePagination(limit, offset, res) {
  if (!isPositiveInteger(limit)) {
    res.status(400).json({ message: "Invalid limit" });
    return false;
  }
  if (!isNonNegativeInteger(offset)) {
    res.status(400).json({ message: "Invalid offset" });
    return false;
  }
  return true;
}

function getRecordActivity(module, id, req, res, invalidMessage) {
  const { limit = "20", offset = "0" } = req.query;

  if (!isPositiveInteger(id)) {
    return res.status(400).json({ message: invalidMessage });
  }

  if (!validatePagination(limit, offset, res)) return;

  db.all(
    `
    SELECT
      activity_logs.*,
      users.full_name AS user_name
    FROM activity_logs
    LEFT JOIN users ON activity_logs.user_id = users.id
    WHERE activity_logs.module = ?
      AND activity_logs.record_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT ? OFFSET ?
    `,
    [module, id, Number(limit), Number(offset)],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(rows);
    },
  );
}

exports.getActivity = (req, res) => {
  const { limit = "20", offset = "0", module, user_id } = req.query;
  const conditions = [];
  const params = [];

  if (module) {
    conditions.push("module = ?");
    params.push(module);
  }

  if (user_id) {
    if (!isPositiveInteger(user_id)) {
      return res.status(400).json({ message: "Invalid user_id" });
    }
    conditions.push("user_id = ?");
    params.push(user_id);
  }

  if (!validatePagination(limit, offset, res)) return;

  let query = `
    SELECT activity_logs.*, users.full_name AS user_name
    FROM activity_logs
    LEFT JOIN users ON activity_logs.user_id = users.id
  `;

  if (conditions.length > 0) query += ` WHERE ${conditions.join(" AND ")} `;

  query += ` ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ? `;
  params.push(Number(limit), Number(offset));

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows);
  });
};

exports.getCaseActivity = (req, res) =>
  getRecordActivity("case", req.params.id, req, res, "Invalid case id");

exports.getClientActivity = (req, res) =>
  getRecordActivity("client", req.params.id, req, res, "Invalid client id");

exports.getServiceActivity = (req, res) =>
  getRecordActivity("service", req.params.id, req, res, "Invalid service id");
