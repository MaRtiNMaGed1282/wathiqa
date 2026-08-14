const db = require("../config/sqlite");

const ALLOWED_FILTERS = new Set(["all", "today", "week", "month", "year", "custom"]);

function getDateCondition(filter, startDate, endDate) {
  if (!ALLOWED_FILTERS.has(filter)) {
    return { error: "نوع فلتر التاريخ غير صالح" };
  }

  if (filter === "custom") {
    if (!startDate || !endDate) {
      return { error: "يجب تحديد تاريخ البداية والنهاية" };
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return { error: "صيغة التاريخ غير صالحة" };
    }

    if (startDate > endDate) {
      return { error: "تاريخ البداية يجب ألا يتجاوز تاريخ النهاية" };
    }

    return {
      sql: "AND date(c.created_at) BETWEEN date(?) AND date(?)",
      params: [startDate, endDate],
    };
  }

  if (filter === "today") {
    return { sql: "AND date(c.created_at) = date('now', 'localtime')", params: [] };
  }

  if (filter === "week") {
    return {
      sql: "AND date(c.created_at) >= date('now', 'localtime', 'weekday 1', '-7 days') AND date(c.created_at) <= date('now', 'localtime')",
      params: [],
    };
  }

  if (filter === "month") {
    return {
      sql: "AND strftime('%Y-%m', c.created_at) = strftime('%Y-%m', 'now', 'localtime')",
      params: [],
    };
  }

  if (filter === "year") {
    return {
      sql: "AND strftime('%Y', c.created_at) = strftime('%Y', 'now', 'localtime')",
      params: [],
    };
  }

  return { sql: "", params: [] };
}

exports.listClients = (req, res) => {
  const filter = String(req.query.filter || "all").toLowerCase();
  const query = String(req.query.q || "").trim();
  const dateCondition = getDateCondition(filter, req.query.startDate, req.query.endDate);

  if (dateCondition.error) {
    return res.status(400).json({ message: dateCondition.error });
  }

  const searchCondition = query
    ? `AND (
        c.full_name LIKE ? OR
        c.client_code LIKE ? OR
        c.national_id LIKE ? OR
        c.phone LIKE ?
      )`
    : "";

  const searchValue = `%${query}%`;
  const params = [...dateCondition.params];

  if (query) {
    params.push(searchValue, searchValue, searchValue, searchValue);
  }

  const sql = `
    SELECT
      c.id,
      c.client_code,
      c.full_name,
      c.national_id,
      c.phone,
      c.address,
      c.notes,
      c.created_at
    FROM clients c
    WHERE 1 = 1
      ${dateCondition.sql}
      ${searchCondition}
    ORDER BY c.created_at DESC, c.id DESC
  `;

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({
        message: "فشل في جلب بيانات الموكلين",
        error: err.message,
      });
    }

    res.json({
      data: rows || [],
      total: rows?.length || 0,
      filter,
      query,
    });
  });
};
