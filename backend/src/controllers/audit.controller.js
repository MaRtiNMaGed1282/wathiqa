const db = require("../config/sqlite");

function positive(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}
function nonNegative(value) {
  return /^\d+$/.test(String(value)) && Number(value) >= 0;
}

exports.getAudit = (req, res) => {
  const {
    limit = "50",
    offset = "0",
    module,
    action,
    user_id,
    record_id,
    from,
    to,
  } = req.query;

  if (!positive(limit) || Number(limit) > 200) return res.status(400).json({ message: "Invalid limit" });
  if (!nonNegative(offset)) return res.status(400).json({ message: "Invalid offset" });
  if (user_id && !positive(user_id)) return res.status(400).json({ message: "Invalid user_id" });
  if (record_id && !positive(record_id)) return res.status(400).json({ message: "Invalid record_id" });

  const conditions = [];
  const params = [];
  if (module) { conditions.push("a.module = ?"); params.push(String(module)); }
  if (action) { conditions.push("a.action = ?"); params.push(String(action)); }
  if (user_id) { conditions.push("a.user_id = ?"); params.push(Number(user_id)); }
  if (record_id) { conditions.push("a.record_id = ?"); params.push(Number(record_id)); }
  if (from) { conditions.push("date(a.created_at) >= date(?)"); params.push(String(from)); }
  if (to) { conditions.push("date(a.created_at) <= date(?)"); params.push(String(to)); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const dataSql = `
    SELECT a.id, a.module, a.record_id, a.action, a.description, a.user_id,
           a.created_at, u.full_name AS user_name, u.username
    FROM activity_logs a
    LEFT JOIN users u ON u.id = a.user_id
    ${where}
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT ? OFFSET ?
  `;
  const countSql = `SELECT COUNT(*) AS total FROM activity_logs a ${where}`;

  db.get(countSql, params, (countErr, countRow) => {
    if (countErr) return res.status(500).json({ message: "تعذر قراءة سجل النشاط" });
    db.all(dataSql, [...params, Number(limit), Number(offset)], (err, rows) => {
      if (err) return res.status(500).json({ message: "تعذر قراءة سجل النشاط" });
      return res.json({ rows, total: countRow.total, limit: Number(limit), offset: Number(offset) });
    });
  });
};
