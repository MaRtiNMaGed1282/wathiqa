const db = require("../config/sqlite");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.login = (req, res) => {
  const { email, password } = req.body;

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

      const validPassword = await bcrypt.compare(password, user.password_hash);

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
        "super_secret_key",
        {
          expiresIn: "7d",
        },
      );

      res.json({
        token,

        must_change_password: Boolean(user.must_change_password),

        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
        },
      });
    },
  );
};
exports.changePassword = async (req, res) => {
  const { email, newPassword } = req.body;

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
    (err) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      res.json({
        message: "Password changed successfully",
      });
    },
  );
};
