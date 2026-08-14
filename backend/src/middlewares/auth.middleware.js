const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");
const db = require("../config/sqlite");

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "غير مصرح",
    });
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (!token) {
    return res.status(401).json({
      message: "غير مصرح",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    db.get(
      `
      SELECT
        id,
        full_name,
        username,
        email,
        role,
        is_active,
        must_change_password
      FROM users
      WHERE id = ?
      `,
      [decoded.id],
      (err, user) => {
        if (err) {
          return res.status(500).json({
            message: err.message,
          });
        }

        if (!user) {
          return res.status(401).json({
            message: "المستخدم غير موجود",
          });
        }

        if (!user.is_active) {
          return res.status(403).json({
            message: "هذا الحساب غير نشط",
          });
        }

        req.user = user;

        const isPasswordChangeRequest =
          req.method === "POST" && req.path === "/change-password";

        if (user.must_change_password && !isPasswordChangeRequest) {
          return res.status(403).json({
            message: "يجب تغيير كلمة المرور قبل استخدام النظام",
            must_change_password: true,
          });
        }

        next();
      },
    );
  } catch (err) {
    return res.status(401).json({
      message: "رمز الدخول غير صالح",
    });
  }
};
