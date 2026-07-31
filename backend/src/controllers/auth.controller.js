const db = require("../config/sqlite");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");

/**
 * Login
 */
exports.login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "البريد الإلكتروني وكلمة المرور مطلوبان",
    });
  }

  db.get(
    `
    SELECT *
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

        return res.json({
          token,

          must_change_password: Boolean(user.must_change_password),

          user: {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
          },
        });
      } catch (error) {
        return res.status(500).json({
          message: error.message,
        });
      }
    },
  );
};

/**
 * Change Password (First Login)
 */
exports.changePassword = (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({
      message: "البيانات غير مكتملة",
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      message: "يجب أن تكون كلمة المرور 8 أحرف على الأقل",
    });
  }

  db.get(
    `
    SELECT id
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
        return res.status(404).json({
          message: "المستخدم غير موجود",
        });
      }

      try {
        const hash = await bcrypt.hash(newPassword, 10);

        db.run(
          `
          UPDATE users
          SET
            password_hash = ?,
            must_change_password = 0
          WHERE email = ?
          `,
          [hash, email],
          function (err) {
            if (err) {
              return res.status(500).json({
                message: err.message,
              });
            }

            return res.json({
              message: "تم تغيير كلمة المرور بنجاح",
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
