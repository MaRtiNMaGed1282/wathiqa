const db = require("../config/sqlite");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");
const logActivity = require("../utils/activityLogger");

const MIN_PASSWORD_LENGTH = 8;

function validatePassword(password) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return "يجب أن تكون كلمة المرور 8 أحرف على الأقل";
  }

  return null;
}

/**
 * Login
 */
exports.login = (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      message: "البريد الإلكتروني وكلمة المرور مطلوبان",
    });
  }

  db.get(
    `
    SELECT
      id,
      full_name,
      username,
      email,
      password_hash,
      role,
      last_login,
      is_active,
      must_change_password
    FROM users
    WHERE email = ?
    `,
    [email],
    async (err, user) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      if (!user) {
        return res.status(401).json({
          message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
        });
      }

      if (!user.is_active) {
        return res.status(403).json({
          message: "هذا الحساب غير نشط",
        });
      }

      try {
        const validPassword = await bcrypt.compare(
          password,
          user.password_hash,
        );

        if (!validPassword) {
          return res.status(401).json({
            message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
          });
        }

        const mustChangePassword = Boolean(user.must_change_password);

        const token = jwt.sign(
          {
            id: user.id,
            email: user.email,
            role: user.role,
          },
          JWT_SECRET,
          {
            expiresIn: "7d",
          },
        );

        db.run(
          `
          UPDATE users
          SET last_login = CURRENT_TIMESTAMP
          WHERE id = ?
          `,
          [user.id],
          (updateErr) => {
            if (updateErr) {
              return res.status(500).json({
                message: updateErr.message,
              });
            }

            return res.json({
              token,
              must_change_password: mustChangePassword,
              user: {
                id: user.id,
                full_name: user.full_name,
                username: user.username,
                email: user.email,
                role: user.role,
              },
            });
          },
        );
      } catch (error) {
        return res.status(500).json({
          message: error.message,
        });
      }
    },
  );
};

/**
 * Change Password
 *
 * Requires an authenticated JWT. The current user is taken from req.user;
 * email is never accepted as an identity selector for this operation.
 */
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      message: "كلمة المرور الحالية والجديدة مطلوبتان",
    });
  }

  const passwordError = validatePassword(newPassword);

  if (passwordError) {
    return res.status(400).json({
      message: passwordError,
    });
  }

  db.get(
    `
    SELECT id, password_hash, must_change_password
    FROM users
    WHERE id = ?
    `,
    [req.user.id],
    async (err, user) => {
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

      try {
        const validCurrentPassword = await bcrypt.compare(
          currentPassword,
          user.password_hash,
        );

        if (!validCurrentPassword) {
          return res.status(401).json({
            message: "كلمة المرور الحالية غير صحيحة",
          });
        }

        const hash = await bcrypt.hash(newPassword, 10);

        db.run(
          `
          UPDATE users
          SET
            password_hash = ?,
            must_change_password = 0
          WHERE id = ?
          `,
          [hash, req.user.id],
          function (updateErr) {
            if (updateErr) {
              return res.status(500).json({
                message: updateErr.message,
              });
            }

            logActivity({
              module: "user",
              record_id: req.user.id,
              action: "password_changed",
              description: "تم تغيير كلمة المرور",
              user_id: req.user.id,
            });

            return res.json({
              message: "تم تغيير كلمة المرور بنجاح",
              must_change_password: false,
            });
          },
        );
      } catch (error) {
        return res.status(500).json({
          message: error.message,
        });
      }
    },
  );
};
