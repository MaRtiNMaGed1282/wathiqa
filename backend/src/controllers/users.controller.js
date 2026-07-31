const db = require("../config/sqlite");
const bcrypt = require("bcryptjs");
const logActivity = require("../utils/activityLogger");

exports.createUser = async (req, res) => {
  try {
    const { full_name, username, password, role } = req.body;

    const email = `${username}@wathiqa.com`;

    const password_hash = await bcrypt.hash(password, 10);

    db.run(
      `
      INSERT INTO users (
        full_name,
        username,
        email,
        password_hash,
        role
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [full_name, username, email, password_hash, role],
      function (err) {
        if (err) {
          return res.status(500).json({
            message: err.message,
          });
        }

        res.status(201).json({
          message: "تم إنشاء المستخدم بنجاح",
          id: this.lastID,
        });
      },
    );
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};
exports.getUsers = (req, res) => {
  db.all(
    `
    SELECT
      id,
      full_name,
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
        return res.status(500).json({
          message: err.message,
        });
      }

      res.json(rows);
    },
  );
};
exports.toggleUserStatus = (req, res) => {
  const { id } = req.params;

  const { is_active } = req.body;

  db.run(
    `
    UPDATE users
    SET is_active = ?
    WHERE id = ?
    `,
    [is_active, id],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          message: "المستخدم غير موجود",
        });
      }

      logActivity({
        module: "user",
        record_id: Number(id),
        action: "updated",
        description: "تم تحديث حالة المستخدم",
        user_id: req.user.id,
      });

      res.json({
        message: "تم تحديث حالة المستخدم بنجاح",
      });
    },
  );
};
exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.params;

    const { password } = req.body;

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
          return res.status(500).json({
            message: err.message,
          });
        }

        if (this.changes === 0) {
          return res.status(404).json({
            message: "المستخدم غير موجود",
          });
        }

        logActivity({
          module: "user",
          record_id: Number(id),
          action: "updated",
          description: "تم إعادة تعيين كلمة المرور",
          user_id: req.user.id,
        });

        res.json({
          message: "تم إعادة تعيين كلمة المرور بنجاح",
        });
      },
    );
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};
exports.deleteUser = (req, res) => {
  const { id } = req.params;

  // منع المستخدم من حذف نفسه
  if (Number(id) === req.user.id) {
    return res.status(400).json({
      message: "لا يمكنك حذف حسابك الحالي",
    });
  }

  db.get(
    `
    SELECT role
    FROM users
    WHERE id = ?
    `,
    [id],
    (err, user) => {
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

      // إذا كان Admin نتحقق أنه ليس آخر Admin
      if (user.role === "admin") {
        db.get(
          `
          SELECT COUNT(*) AS count
          FROM users
          WHERE role = 'admin'
          `,
          [],
          (err, result) => {
            if (err) {
              return res.status(500).json({
                message: err.message,
              });
            }

            if (result.count <= 1) {
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
          `
          DELETE FROM users
          WHERE id = ?
          `,
          [id],
          function (err) {
            if (err) {
              return res.status(500).json({
                message: err.message,
              });
            }

            if (this.changes === 0) {
              return res.status(404).json({
                message: "المستخدم غير موجود",
              });
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
