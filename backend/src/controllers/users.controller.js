const db = require("../config/sqlite");
const bcrypt = require("bcryptjs");
const logActivity = require("../utils/activityLogger");

const MIN_PASSWORD_LENGTH = 8;
const ALLOWED_ROLES = new Set(["admin", "lawyer", "assistant"]);

function validatePassword(password) {
  return typeof password === "string" && password.length >= MIN_PASSWORD_LENGTH;
}

function validateUserInput({ full_name, username, password, role }) {
  if (!full_name || !username || !password || !role) {
    return "الاسم واسم المستخدم وكلمة المرور والدور مطلوبة";
  }

  if (!ALLOWED_ROLES.has(role)) {
    return "الدور المحدد غير صالح";
  }

  if (!validatePassword(password)) {
    return "يجب أن تكون كلمة المرور 8 أحرف على الأقل";
  }

  if (!/^[A-Za-z0-9._-]+$/.test(username)) {
    return "اسم المستخدم يجب أن يحتوي على أحرف وأرقام ورموز . _ - فقط";
  }

  return null;
}

function isUniqueConstraintError(error) {
  return /UNIQUE|unique constraint/i.test(error?.message || "");
}

exports.createUser = async (req, res) => {
  try {
    const { full_name, username, password, role } = req.body || {};
    const validationError = validateUserInput({
      full_name,
      username,
      password,
      role,
    });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const email = `${normalizedUsername}@wathiqa.com`;
    const password_hash = await bcrypt.hash(password, 10);

    db.run(
      `
      INSERT INTO users (
        full_name,
        username,
        email,
        password_hash,
        role,
        is_active,
        must_change_password
      )
      VALUES (?, ?, ?, ?, ?, 1, 0)
      `,
      [full_name.trim(), normalizedUsername, email, password_hash, role],
      function (err) {
        if (err) {
          if (isUniqueConstraintError(err)) {
            return res.status(409).json({
              message: "اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل",
            });
          }

          return res.status(500).json({ message: err.message });
        }

        logActivity({
          module: "user",
          record_id: this.lastID,
          action: "created",
          description: "تم إنشاء مستخدم جديد",
          user_id: req.user.id,
        });

        res.status(201).json({
          message: "تم إنشاء المستخدم بنجاح",
          id: this.lastID,
          user: {
            id: this.lastID,
            full_name: full_name.trim(),
            username: normalizedUsername,
            email,
            role,
            is_active: 1,
            last_login: null,
          },
        });
      },
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUsers = (req, res) => {
  db.all(
    `
    SELECT
      id,
      full_name,
      username,
      email,
      role,
      last_login,
      is_active
    FROM users
    ORDER BY id DESC
    `,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      res.json(rows);
    },
  );
};

exports.getUserStats = (req, res) => {
  db.get(
    `
    SELECT
      COUNT(*) AS total_users,
      COALESCE(SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END), 0) AS active_users,
      COALESCE(SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END), 0) AS inactive_users,
      COALESCE(SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END), 0) AS total_admins
    FROM users
    `,
    [],
    (err, stats) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      res.json({
        total_users: Number(stats?.total_users || 0),
        active_users: Number(stats?.active_users || 0),
        inactive_users: Number(stats?.inactive_users || 0),
        total_admins: Number(stats?.total_admins || 0),
      });
    },
  );
};

exports.toggleUserStatus = (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body || {};

  if (![0, 1, false, true].includes(is_active)) {
    return res.status(400).json({ message: "حالة المستخدم غير صالحة" });
  }

  const activeValue = is_active === true || is_active === 1 ? 1 : 0;

  db.get(
    `SELECT id, role, is_active FROM users WHERE id = ?`,
    [id],
    (err, user) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      if (!user) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }

      if (Number(id) === Number(req.user.id) && activeValue === 0) {
        return res.status(400).json({
          message: "لا يمكنك تعطيل حسابك الحالي",
        });
      }

      db.run(
        `UPDATE users SET is_active = ? WHERE id = ?`,
        [activeValue, id],
        function (updateErr) {
          if (updateErr) {
            return res.status(500).json({ message: updateErr.message });
          }

          if (this.changes === 0) {
            return res.status(404).json({ message: "المستخدم غير موجود" });
          }

          logActivity({
            module: "user",
            record_id: Number(id),
            action: "updated",
            description: activeValue
              ? "تم تفعيل المستخدم"
              : "تم تعطيل المستخدم",
            user_id: req.user.id,
          });

          res.json({
            message: activeValue
              ? "تم تفعيل المستخدم بنجاح"
              : "تم تعطيل المستخدم بنجاح",
          });
        },
      );
    },
  );
};

exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body || {};

    if (!validatePassword(password)) {
      return res.status(400).json({
        message: "يجب أن تكون كلمة المرور 8 أحرف على الأقل",
      });
    }

    const password_hash = await bcrypt.hash(password, 10);

    db.run(
      `
      UPDATE users
      SET password_hash = ?,
          must_change_password = 1
      WHERE id = ?
      `,
      [password_hash, id],
      function (err) {
        if (err) {
          return res.status(500).json({ message: err.message });
        }

        if (this.changes === 0) {
          return res.status(404).json({ message: "المستخدم غير موجود" });
        }

        logActivity({
          module: "user",
          record_id: Number(id),
          action: "password_reset",
          description: "تم إعادة تعيين كلمة المرور وفرض تغييرها عند الدخول",
          user_id: req.user.id,
        });

        res.json({
          message: "تم إعادة تعيين كلمة المرور بنجاح",
        });
      },
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteUser = (req, res) => {
  const { id } = req.params;

  if (Number(id) === Number(req.user.id)) {
    return res.status(400).json({
      message: "لا يمكنك حذف حسابك الحالي",
    });
  }

  db.get(
    `SELECT id, role FROM users WHERE id = ?`,
    [id],
    (err, user) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      if (!user) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }

      if (user.role === "admin") {
        db.get(
          `SELECT COUNT(*) AS count FROM users WHERE role = 'admin'`,
          [],
          (countErr, result) => {
            if (countErr) {
              return res.status(500).json({ message: countErr.message });
            }

            if (Number(result.count) <= 1) {
              return res.status(400).json({
                message: "لا يمكن حذف آخر مدير نظام",
              });
            }

            performDelete();
          },
        );
      } else {
        performDelete();
      }

      function performDelete() {
        db.run(
          `DELETE FROM users WHERE id = ?`,
          [id],
          function (deleteErr) {
            if (deleteErr) {
              return res.status(500).json({ message: deleteErr.message });
            }

            if (this.changes === 0) {
              return res.status(404).json({ message: "المستخدم غير موجود" });
            }

            logActivity({
              module: "user",
              record_id: Number(id),
              action: "deleted",
              description: "تم حذف المستخدم",
              user_id: req.user.id,
            });

            res.json({
              message: "تم حذف المستخدم بنجاح",
            });
          },
        );
      }
    },
  );
};
