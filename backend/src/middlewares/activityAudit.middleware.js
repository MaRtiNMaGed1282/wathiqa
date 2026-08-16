const db = require("../config/sqlite");

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const MODULE_MAP = [
  ["/api/case-expenses", "case-expense"],
  ["/api/revenues", "revenue"],
  ["/api/reports", "report"],
  ["/api/pdfs", "pdf"],
  ["/api/clients", "client"],
  ["/api/cases", "case"],
  ["/api/services", "service"],
  ["/api/hearings", "hearing"],
  ["/api/files", "file"],
  ["/api/payments", "payment"],
  ["/api/expenses", "expense"],
  ["/api/users", "user"],
  ["/api/permissions", "permission"],
  ["/api/office", "office"],
  ["/api/license", "license"],
  ["/api/notifications", "notification"],
  ["/api/templates", "template"],
  ["/api/backup", "backup"],
];

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
  update: "تم تعديل",
  delete: "تم حذف",
  upload: "تم رفع",
  restore: "تم استعادة",
  reset: "تم إعادة ضبط",
  activate: "تم تفعيل",
  verify: "تم التحقق من",
  pay: "تم تسجيل",
  expense: "تم تسجيل",
});

function resolveModule(pathname) {
  const entry = MODULE_MAP.find(([prefix]) => pathname.startsWith(prefix));
  return entry ? entry[1] : null;
}

function resolveAction(method, pathname) {
  const operation = pathname.split("/").filter(Boolean).slice(-1)[0] || "mutation";
  if (method === "POST") {
    if (/(activate|upload|reset|password|pay|expense|restore|verify)/i.test(operation)) return operation.toLowerCase();
    return "create";
  }
  if (method === "PUT" || method === "PATCH") return "update";
  if (method === "DELETE") return "delete";
  return "mutation";
}

function resolveRecordId(req) {
  if (req.params && req.params.id && /^\d+$/.test(String(req.params.id))) return Number(req.params.id);
  if (req.body && req.body.id && /^\d+$/.test(String(req.body.id))) return Number(req.body.id);
  return null;
}

function createDescription(module, action) {
  const actionLabel = ACTION_LABELS[action] || "تم تنفيذ";
  const moduleLabel = MODULE_LABELS[module] || "عملية";
  return `${actionLabel} ${moduleLabel}`;
}

module.exports = function activityAuditMiddleware(req, res, next) {
  res.on("finish", () => {
    if (!MUTATING_METHODS.has(req.method) || req.activityAuditDisabled || res.statusCode >= 400) return;

    const module = resolveModule(req.originalUrl || req.url || "");
    if (!module) return;

    const userId = req.user && req.user.id ? Number(req.user.id) : null;
    const recordId = resolveRecordId(req);

    // activity_logs.record_id is intentionally NOT NULL. Some successful
    // mutations (for example office/system actions) do not have a related
    // database record in the request. Do not write an invalid audit row.
    // Mutations that create/delete a real record are expected to provide the
    // record ID through the route/body or their existing explicit logger.
    if (recordId === null) return;

    const action = resolveAction(req.method, req.originalUrl || req.url || "");
    const description = createDescription(module, action);

    db.run(
      `INSERT INTO activity_logs (module, record_id, action, description, user_id) VALUES (?, ?, ?, ?, ?)`,
      [module, recordId, action, description, userId],
      (err) => {
        if (err) console.error("Activity Audit Error:", err.message);
      },
    );
  });

  next();
};
