const db = require("../config/sqlite");

function normalizePositiveInteger(value, fallback) {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = String(raw ?? fallback).trim();
  if (!/^\d+$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function normalizeNonNegativeInteger(value, fallback) {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = String(raw ?? fallback).trim();
  if (!/^\d+$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

/**
 * Unified, read-only timeline for a client and records directly related to it.
 */
exports.getClientTimeline = (req, res) => {
  const clientId = normalizePositiveInteger(req.params.id);
  const pageLimit = normalizePositiveInteger(req.query.limit, 20);
  const pageOffset = normalizeNonNegativeInteger(req.query.offset, 0);

  if (clientId === null) return res.status(400).json({ message: "Invalid client id" });
  if (pageLimit === null) return res.status(400).json({ message: "Invalid limit" });
  if (pageOffset === null) return res.status(400).json({ message: "Invalid offset" });

  const query = `
    SELECT al.*, u.full_name AS user_name
    FROM activity_logs al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE
      (al.module = 'client' AND al.record_id = ?)
      OR (al.module = 'case' AND al.record_id IN (
        SELECT case_id FROM legal_cases WHERE client_id = ?
      ))
      OR (al.module = 'service' AND al.record_id IN (
        SELECT service_id FROM legal_services WHERE client_id = ?
      ))
      OR (al.module = 'hearing' AND al.record_id IN (
        SELECT h.hearing_id FROM hearings h
        INNER JOIN legal_cases lc ON lc.case_id = h.case_id
        WHERE lc.client_id = ?
      ))
      OR (al.module = 'payment' AND al.record_id IN (
        SELECT p.payment_id FROM payments p
        LEFT JOIN legal_cases lc ON lc.case_id = p.case_id
        LEFT JOIN legal_services ls ON ls.service_id = p.service_id
        WHERE lc.client_id = ? OR ls.client_id = ?
      ))
      OR (al.module = 'expense' AND al.record_id IN (
        SELECT ce.expense_id FROM case_expenses ce
        INNER JOIN legal_cases lc ON lc.case_id = ce.case_id
        WHERE lc.client_id = ?
      ))
      OR (al.module = 'file' AND al.record_id IN (
        SELECT cf.file_id FROM case_files cf
        INNER JOIN legal_cases lc ON lc.case_id = cf.case_id
        WHERE lc.client_id = ?
      ))
      OR (al.module = 'service_file' AND al.record_id IN (
        SELECT sf.file_id FROM service_files sf
        INNER JOIN legal_services ls ON ls.service_id = sf.service_id
        WHERE ls.client_id = ?
      ))
    ORDER BY al.created_at DESC, al.id DESC
    LIMIT ? OFFSET ?
  `;

  const params = [
    clientId, clientId, clientId, clientId,
    clientId, clientId, clientId, clientId, clientId,
    pageLimit, pageOffset,
  ];

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("Client timeline query failed:", err.message);
      return res.status(500).json({ message: "فشل تحميل سجل الموكل", error: err.message });
    }
    return res.json(rows || []);
  });
};
