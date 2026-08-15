const db = require("../config/sqlite");

function isPositiveInteger(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

function isNonNegativeInteger(value) {
  return /^\d+$/.test(String(value)) && Number(value) >= 0;
}

/**
 * Returns a unified client timeline made from the client's own activity and
 * activity belonging to records directly related to that client.
 *
 * The existing activity endpoint remains unchanged. This endpoint is additive
 * and is intentionally read-only.
 */
exports.getClientTimeline = (req, res) => {
  const { id } = req.params;
  const { limit = "20", offset = "0" } = req.query;

  if (!isPositiveInteger(id)) {
    return res.status(400).json({ message: "Invalid client id" });
  }

  if (!isPositiveInteger(limit)) {
    return res.status(400).json({ message: "Invalid limit" });
  }

  if (!isNonNegativeInteger(offset)) {
    return res.status(400).json({ message: "Invalid offset" });
  }

  const clientId = Number(id);
  const pageLimit = Number(limit);
  const pageOffset = Number(offset);

  const query = `
    SELECT
      al.*,
      u.full_name AS user_name
    FROM activity_logs al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE
      (al.module = 'client' AND al.record_id = ?)
      OR (
        al.module = 'case'
        AND al.record_id IN (
          SELECT case_id FROM legal_cases WHERE client_id = ?
        )
      )
      OR (
        al.module = 'service'
        AND al.record_id IN (
          SELECT service_id FROM legal_services WHERE client_id = ?
        )
      )
      OR (
        al.module = 'hearing'
        AND al.record_id IN (
          SELECT h.id
          FROM hearings h
          INNER JOIN legal_cases lc ON lc.case_id = h.case_id
          WHERE lc.client_id = ?
        )
      )
      OR (
        al.module = 'payment'
        AND al.record_id IN (
          SELECT p.id
          FROM payments p
          INNER JOIN legal_cases lc ON lc.case_id = p.case_id
          WHERE lc.client_id = ?
        )
      )
      OR (
        al.module = 'expense'
        AND al.record_id IN (
          SELECT ce.id
          FROM case_expenses ce
          INNER JOIN legal_cases lc ON lc.case_id = ce.case_id
          WHERE lc.client_id = ?
        )
      )
      OR (
        al.module = 'file'
        AND al.record_id IN (
          SELECT cf.file_id
          FROM case_files cf
          INNER JOIN legal_cases lc ON lc.case_id = cf.case_id
          WHERE lc.client_id = ?
        )
      )
      OR (
        al.module = 'service_file'
        AND al.record_id IN (
          SELECT sf.file_id
          FROM service_files sf
          INNER JOIN legal_services ls ON ls.service_id = sf.service_id
          WHERE ls.client_id = ?
        )
      )
    ORDER BY al.created_at DESC, al.id DESC
    LIMIT ? OFFSET ?
  `;

  const params = [
    clientId,
    clientId,
    clientId,
    clientId,
    clientId,
    clientId,
    clientId,
    clientId,
    pageLimit,
    pageOffset,
  ];

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("Client timeline query failed:", err.message);
      return res.status(500).json({ message: "فشل تحميل سجل الموكل" });
    }

    return res.json(rows);
  });
};
