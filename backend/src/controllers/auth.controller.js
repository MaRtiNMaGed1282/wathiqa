const db = require("../config/sqlite");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { JWT_SECRET } = require("../config/env");
const { createSession, revokeSession, revokeAllSessions } = require("../services/session.service");
const logActivity = require("../utils/activityLogger");

/** تسجيل الدخول */
exports.login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ message: "البريد الإلكتروني وكلمة المرور مطلوبان" });

  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
    if (err) return res.status(500).json({ message: "تعذر الوصول إلى بيانات المستخدمين" });
    if (!user || Number(user.is_active) !== 1) return res.status(401).json({ message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });

    try {
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) return res.status(401).json({ message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });

      const jti = crypto.randomUUID();
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role, jti }, JWT_SECRET, { expiresIn: "7d" });
      await createSession({ userId: user.id, jti, token, req });

      db.run(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);
      logActivity({ module: "auth", record_id: user.id, action: "login", description: "تم تسجيل الدخول", user_id: user.id });

      return res.json({
        token,
        must_change_password: Boolean(user.must_change_password),
        user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role },
      });
    } catch (error) {
      console.error("فشل تسجيل الدخول:", error.message);
      return res.status(500).json({ message: "تعذر تسجيل الدخول حالياً" });
    }
  });
};

exports.logout = async (req, res) => {
  try {
    await revokeSession(req.auth?.jti, req.user.id);
    logActivity({ module: "auth", record_id: req.user.id, action: "logout", description: "تم تسجيل الخروج", user_id: req.user.id });
    return res.json({ message: "تم تسجيل الخروج بنجاح" });
  } catch (error) {
    console.error("فشل إنهاء جلسة الدخول:", error.message);
    return res.status(500).json({ message: "تعذر إنهاء جلسة الدخول" });
  }
};

exports.logoutAll = async (req, res) => {
  try {
    const count = await revokeAllSessions(req.user.id, req.auth?.jti || null);
    logActivity({ module: "auth", record_id: req.user.id, action: "logout_all", description: `تم إنهاء ${count} جلسة أخرى`, user_id: req.user.id });
    return res.json({ message: "تم إنهاء جلسات الدخول الأخرى", revoked: count });
  } catch (error) {
    console.error("فشل إنهاء جلسات الدخول الأخرى:", error.message);
    return res.status(500).json({ message: "تعذر إنهاء جلسات الدخول" });
  }
};

/** تغيير كلمة المرور */
exports.changePassword = (req, res) => {
  const userId = req.user?.id;
  const { newPassword } = req.body;

  if (!userId || !newPassword) return res.status(400).json({ message: "البيانات غير مكتملة" });
  if (typeof newPassword !== "string" || newPassword.length < 8) return res.status(400).json({ message: "يجب أن تكون كلمة المرور 8 أحرف على الأقل" });

  db.get(`SELECT id FROM users WHERE id = ? AND is_active = 1`, [userId], async (err, user) => {
    if (err) return res.status(500).json({ message: "تعذر الوصول إلى بيانات المستخدم" });
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود أو غير نشط" });

    try {
      const hash = await bcrypt.hash(newPassword, 10);
      db.run(`UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?`, [hash, userId], async function (err) {
        if (err) return res.status(500).json({ message: "تعذر تغيير كلمة المرور" });
        await revokeAllSessions(userId, req.auth?.jti || null);
        logActivity({ module: "auth", record_id: userId, action: "password_changed", description: "تم تغيير كلمة المرور وإنهاء جلسات الدخول الأخرى", user_id: userId });
        return res.json({ message: "تم تغيير كلمة المرور بنجاح" });
      });
    } catch (error) {
      console.error("فشل تغيير كلمة المرور:", error.message);
      return res.status(500).json({ message: "تعذر تغيير كلمة المرور حالياً" });
    }
  });
};
