const ALLOWED_ROLES = new Set(["admin", "lawyer", "assistant"]);

function authorize(...roles) {
  const allowedRoles = roles.flat();

  if (allowedRoles.length === 0) {
    throw new Error("authorize requires at least one role");
  }

  for (const role of allowedRoles) {
    if (!ALLOWED_ROLES.has(role)) {
      throw new Error(`Unsupported authorization role: ${role}`);
    }
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "غير مصرح",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "ليس لديك صلاحية لتنفيذ هذا الإجراء",
      });
    }

    next();
  };
}

module.exports = authorize;
