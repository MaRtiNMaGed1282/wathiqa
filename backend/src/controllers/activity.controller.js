const db = require("../config/sqlite");

function isPositiveInteger(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

function isNonNegativeInteger(value) {
  return /^\d+$/.test(String(value)) && Number(value) >= 0;
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
      return res.status(400).json({
        message: "Invalid user_id",
      });
    }

    conditions.push("user_id = ?");
    params.push(user_id);
  }

  if (!isPositiveInteger(limit)) {
    return res.status(400).json({
      message: "Invalid limit",
    });
  }

  if (!isNonNegativeInteger(offset)) {
    return res.status(400).json({
      message: "Invalid offset",
    });
  }

  let query = `
    SELECT
      activity_logs.*,
      users.full_name AS user_name
    FROM activity_logs
    LEFT JOIN users
      ON activity_logs.user_id = users.id
  `;

  if (conditions.length > 0) {
    query += `
    WHERE ${conditions.join(" AND ")}
    `;
  }

  query += `
    ORDER BY created_at DESC,
             id DESC
    LIMIT ?
    OFFSET ?
  `;
  params.push(Number(limit), Number(offset));

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({
        message: err.message,
      });
    }

    res.json(rows);
  });
};

exports.getCaseActivity = (req, res) => {
  const { id } = req.params;
  const { limit = "20", offset = "0" } = req.query;

  if (!isPositiveInteger(id)) {
    return res.status(400).json({
      message: "Invalid case id",
    });
  }

  if (!isPositiveInteger(limit)) {
    return res.status(400).json({
      message: "Invalid limit",
    });
  }

  if (!isNonNegativeInteger(offset)) {
    return res.status(400).json({
      message: "Invalid offset",
    });
  }

  db.all(
    `
    SELECT
      activity_logs.*,
      users.full_name AS user_name
    FROM activity_logs
    LEFT JOIN users
      ON activity_logs.user_id = users.id
    WHERE module = ?
    AND record_id = ?
    ORDER BY created_at DESC,
             id DESC
    LIMIT ?
    OFFSET ?
    `,
    ["case", id, Number(limit), Number(offset)],
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

exports.getClientActivity = (req, res) => {
  const { id } = req.params;
  const { limit = "20", offset = "0" } = req.query;

  if (!isPositiveInteger(id)) {
    return res.status(400).json({
      message: "Invalid client id",
    });
  }

  if (!isPositiveInteger(limit)) {
    return res.status(400).json({
      message: "Invalid limit",
    });
  }

  if (!isNonNegativeInteger(offset)) {
    return res.status(400).json({
      message: "Invalid offset",
    });
  }

  db.all(
    `
    SELECT
      activity_logs.*,
      users.full_name AS user_name
    FROM activity_logs
    LEFT JOIN users
      ON activity_logs.user_id = users.id
    WHERE module = ?
    AND record_id = ?
    ORDER BY created_at DESC,
             id DESC
    LIMIT ?
    OFFSET ?
    `,
    ["client", id, Number(limit), Number(offset)],
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
