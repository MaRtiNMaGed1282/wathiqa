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
  ["/api/office", "office"],
  ["/api/license", "license"],
  ["/api/notifications", "notification"],
  ["/api/templates", "template"],
];

function resolveModule(pathname) {
  const entry = MODULE_MAP.find(([prefix]) => pathname.startsWith(prefix));
  return entry ? entry[1] : null;
}

function resolveAction(method, pathname) {
  const operation = pathname.split("/").filter(Boolean).slice(-1)[0] || "mutation";

  if (method === "POST") {
    if (/(activate|upload|reset|password|pay|expense)/i.test(operation)) return operation.toLowerCase();
    return "create";
  }

  if (method === "PUT" || method === "PATCH") return "update";
  if (method === "DELETE") return "delete";
  return "mutation";
}

function resolveRecordId(req) {
  if (req.params && req.params.id && /^\d+$/.test(String(req.params.id))) {
    return Number(req.params.id);
  }

  if (req.body && req.body.id && /^\d+$/.test(String(req.body.id))) {
    return Number(req.body.id);
  }

  return null;
}

function createDescription(req, module, action) {
  const route = req.originalUrl || req.url || "";
  return JSON.stringify({
    source: "request-audit",
    method: req.method,
    route,
    module,
    action,
  });
}

module.exports = function activityAuditMiddleware(req, res, next) {
  res.on("finish", () => {
    if (!MUTATING_METHODS.has(req.method)) return;
    if (req.activityAuditDisabled) return;
    if (res.statusCode >= 400) return;

    const module = resolveModule(req.originalUrl || req.url || "");
    if (!module) return;

    const userId = req.user && req.user.id ? Number(req.user.id) : null;
    const recordId = resolveRecordId(req);
    const action = resolveAction(req.method, req.originalUrl || req.url || "");
    const description = createDescription(req, module, action);

    db.run(
      `
      INSERT INTO activity_logs
      (module, record_id, action, description, user_id)
      VALUES (?, ?, ?, ?, ?)
      `,
      [module, recordId, action, description, userId],
      (err) => {
        if (err) {
          console.error("Activity Audit Error:", err.message);
        }
      },
    );
  });

  next();
};
