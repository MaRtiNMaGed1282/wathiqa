const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");
const db = require("../config/sqlite");

function isPasswordChangeRequest(req) {
  return req.originalUrl === "/api/auth/change-password";
}

function getPermissionTarget(req) {
  const path = String(req.path || req.originalUrl || "").toLowerCase();
  let module = null;

  if (path.startsWith("/api/clients")) module = "clients";
  else if (path.startsWith("/api/cases")) module = "cases";
  else if (path.startsWith("/api/case-expenses")) module = "revenues";
  else if (path.startsWith("/api/services")) module = "services";
  else if (path.startsWith("/api/hearings")) module = "calendar";
  else if (path.startsWith("/api/files") || path.startsWith("/api/attorneys")) module = "documents";
  else if (path.startsWith("/api/library")) module = "laws";
  else if (path.startsWith("/api/revenues") || path.startsWith("/api/payments") || path.startsWith("/api/expenses")) module = "revenues";
  else if (path.startsWith("/api/reports") || path.startsWith("/api/pdfs")) module = "reports";
  else if (path.startsWith("/api/backup")) module = "backup";
  else return null;

  const method = String(req.method || "GET").toUpperCase();
  const action = method === "GET" || method === "HEAD" ? "view" : method === "POST" ? "create" : method === "DELETE" ? "delete" : "edit";
  return { module, action };
}

function checkPermission(req, user, next) {
  if (user.role === "admin") return next();

  const target = getPermissionTarget(req);
  if (!target) return next();

  db.get(`
    SELECT can_view, can_create, can_edit, can_delete
    FROM user_permissions
    WHERE user_id = ? AND module = ?
  `, [user.id, target.module], (err, permission) => {
    if (err) {
      return resError(next, "تعذر التحقق من صلاحيات المستخدم");
    }

    if (!permission || Number(permission[`can_${target.action}`]) !== 1) {
      return next({ status: 403, code: "PERMISSION_DENIED", message: "ليس لديك صلاحية لتنفيذ هذا الإجراء" });
    }

    next();
  });
}

function resError(next, message) {
  return next({ status: 500, message });
}

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "غير مصرح" });
  }

  const [scheme, token] = authHeader.trim().split(/\s+/);

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "صيغة رمز الدخول غير صالحة" });
  }

  let decoded;

  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: "رمز الدخول غير صالح" });
  }

  if (!decoded?.id) {
    return res.status(401).json({ message: "رمز الدخول غير صالح" });
  }

  db.get(`
    SELECT id, full_name, email, role, is_active, must_change_password
    FROM users
    WHERE id = ?
  `, [decoded.id], (err, user) => {
    if (err) return res.status(500).json({ message: "تعذر التحقق من المستخدم" });

    if (!user || Number(user.is_active) !== 1) {
      return res.status(401).json({ message: "الحساب غير نشط أو غير موجود" });
    }

    req.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      must_change_password: Boolean(user.must_change_password),
    };

    if (req.user.must_change_password && !isPasswordChangeRequest(req)) {
      return res.status(403).json({
        message: "يجب تغيير كلمة المرور قبل استخدام النظام",
        code: "PASSWORD_CHANGE_REQUIRED",
      });
    }

    checkPermission(req, req.user, (permissionError) => {
      if (permissionError) {
        return res.status(permissionError.status || 500).json({
          message: permissionError.message || "حدث خطأ في التحقق من الصلاحيات",
          ...(permissionError.code ? { code: permissionError.code } : {}),
        });
      }
      next();
    });
  });
};
