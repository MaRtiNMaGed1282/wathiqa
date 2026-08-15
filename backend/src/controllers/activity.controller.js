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

const MODULE_LABELS = Object.freeze({
  client: "الموكل",
  case: "القضية",
  hearing: "الجلسة",
  service: "الخدمة",
  payment: "الدفعة",
  expense: "المصروف",
  file: "الملف",
  office: "بيانات المكتب",
  user: "المستخدم",
  permission: "الصلاحيات",
  backup: "النسخة الاحتياطية",
  license: "الترخيص",
  notification: "الإشعار",
  template: "النموذج",
  revenue: "الإيراد",
  report: "التقرير",
});

const ACTION_LABELS = Object.freeze({
  create: "تم إنشاء",
  created: "تم إنشاء",
  update: "تم تعديل",
  updated: "تم تعديل",
  delete: "تم حذف",
  deleted: "تم حذف",
  upload: "تم رفع",
  uploaded: "تم رفع",
  restore: "تم استعادة",
  reset: "تم إعادة ضبط",
  activate: "تم تفعيل",
  verify: "تم التحقق من",
  pay: "تم تسجيل",
  expense: "تم تسجيل",
});

function humanizeDescription(row) {
  const raw = typeof row.description === "string" ? row.description.trim() : "";

  if (!raw) {
    return row.action || "نشاط";
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.source === "request-audit") {
      const action = ACTION_LABELS[String(row.action || parsed.action || "").toLowerCase()];
      const module = MODULE_LABELS[String(row.module || parsed.module || "").toLowerCase()];
      if (action && module) return `${action} ${module}`;
      if (action) return action;
    }
  } catch {
    // Existing non-JSON activity descriptions are already human-readable.
  }

  return raw;
}

function normalizeActivityRows(rows) {
  return rows.map((row) => ({
    ...row,
    description: humanizeDescription(row),
  }));
}

function validatePagination(req, res) {
  const limit = normalizePositiveInteger(req.query.limit, 20);
  const offset = normalizeNonNegativeInteger(req.query.offset, 0);

  if (limit === null) {
    res.status(400).json({ message: "Invalid limit" });
    return null;
  }

  if (offset === null) {
    res.status(400).json({ message: "Invalid offset" });
    return null;
  }

  return { limit, offset };
}

exports.getActivity = (req, res) => {
  const { module } = req.query;
  const pagination = validatePagination(req, res);
  if (!pagination) return;

  const { limit, offset } = pagination;
  const conditions = [];
  const params = [];

  if (module) {
    conditions.push("module = ?");
    params.push(Array.isArray(module) ? module[0] : module);
  }

  if (req.query.user_id != null) {
    const userId = normalizePositiveInteger(req.query.user_id);
    if (userId === null) {
      return res.status(400).json({ message: "Invalid user_id" });
    }
    conditions.push("user_id = ?");
    params.push(userId);
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
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += `
    ORDER BY created_at DESC,
             id DESC
    LIMIT ?
    OFFSET ?
  `;
  params.push(limit, offset);

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }

    res.json(normalizeActivityRows(rows));
  });
};

exports.getCaseActivity = (req, res) => {
  const { id } = req.params;
  const pagination = validatePagination(req, res);
  if (!pagination) return;

  const caseId = normalizePositiveInteger(id);
  if (caseId === null) {
    return res.status(400).json({ message: "Invalid case id" });
  }

  const { limit, offset } = pagination;

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
    ["case", caseId, limit, offset],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      res.json(normalizeActivityRows(rows));
    },
  );
};

exports.getClientActivity = (req, res) => {
  const { id } = req.params;
  const pagination = validatePagination(req, res);
  if (!pagination) return;

  const clientId = normalizePositiveInteger(id);
  if (clientId === null) {
    return res.status(400).json({ message: "Invalid client id" });
  }

  const { limit, offset } = pagination;

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
    ["client", clientId, limit, offset],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      res.json(normalizeActivityRows(rows));
    },
  );
};
