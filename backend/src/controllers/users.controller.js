const db = require("../config/sqlite");
const bcrypt = require("bcryptjs");
const logActivity = require("../utils/activityLogger");
const { MODULES, getRoleDefaults } = require("../config/permissions");

function seedUserPermissions(userId, role, callback) {
  const defaults = getRoleDefaults(role);
  db.serialize(() => {
    const statement = db.prepare(`
      INSERT OR IGNORE INTO user_permissions
        (user_id, module, can_view, can_create, can_edit, can_delete)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    MODULES.forEach(({ key }) => {
      const value = defaults[key] || {};
      statement.run(userId, key, value.view || 0, value.create || 0, value.edit || 0, value.delete || 0);
    });
    statement.finalize(callback);
  });
}

exports.createUser = async (req, res) => {
  try {
    const { full_name, username, password, role } = req.body;
    const email = `${username}@wathiqa.com`;
    const password_hash = await bcrypt.hash(password, 10);

    db.run(`INSERT INTO users (full_name, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`, [full_name, username, email, password_hash, role], function (err) {
      if (err) return res.status(500).json({ message: err.message });
      const userId = this.lastID;
      seedUserPermissions(userId, role, (permissionErr) => {
        if (permissionErr) return res.status(500).json({ message: "تم إنشاء المستخدم لكن تعذر تهيئة صلاحياته" });
        logActivity({ module: "user", record_id: userId, action: "created", description: "تم إنشاء مستخدم جديد", user_id: req.user.id });
        res.status(201).json({ message: "تم إنشاء المستخدم بنجاح", id: userId });
      });
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getUsers = (req, res) => {
  db.all(`SELECT id, full_name, username, email, role, last_login, is_active FROM users ORDER BY id DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows);
  });
};

exports.toggleUserStatus = (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  if (Number(id) === Number(req.user.id) && Number(is_active) !== 1) return res.status(400).json({ message: "لا يمكنك تعطيل حسابك الحالي" });

  db.get(`SELECT id, role, is_active FROM users WHERE id = ?`, [id], (lookupErr, target) => {
    if (lookupErr) return res.status(500).json({ message: lookupErr.message });
    if (!target) return res.status(404).json({ message: "المستخدم غير موجود" });
    if (target.role === "admin" && Number(is_active) !== 1) {
      db.get(`SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1`, [], (countErr, result) => {
        if (countErr) return res.status(500).json({ message: countErr.message });
        if (Number(result.count) <= 1) return res.status(400).json({ message: "لا يمكن تعطيل آخر مدير نظام نشط" });
        update();
      });
    } else update();

    function update() {
      db.run(`UPDATE users SET is_active = ? WHERE id = ?`, [is_active ? 1 : 0, id], function (err) {
        if (err) return res.status(500).json({ message: err.message });
        if (this.changes === 0) return res.status(404).json({ message: "المستخدم غير موجود" });
        logActivity({ module: "user", record_id: Number(id), action: "updated", description: "تم تحديث حالة المستخدم", user_id: req.user.id });
        res.json({ message: "تم تحديث حالة المستخدم بنجاح" });
      });
    }
  });
};

exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password || String(password).length < 6) return res.status(400).json({ message: "كلمة المرور يجب ألا تقل عن 6 أحرف" });
    const password_hash = await bcrypt.hash(password, 10);
    db.run(`UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?`, [password_hash, id], function (err) {
      if (err) return res.status(500).json({ message: err.message });
      if (this.changes === 0) return res.status(404).json({ message: "المستخدم غير موجود" });
      logActivity({ module: "user", record_id: Number(id), action: "updated", description: "تم إعادة تعيين كلمة المرور", user_id: req.user.id });
      res.json({ message: "تم إعادة تعيين كلمة المرور بنجاح" });
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteUser = (req, res) => {
  const { id } = req.params;
  if (Number(id) === req.user.id) return res.status(400).json({ message: "لا يمكنك حذف حسابك الحالي" });

  db.get(`SELECT role FROM users WHERE id = ?`, [id], (err, user) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

    const performDelete = () => db.run(`DELETE FROM users WHERE id = ?`, [id], function (deleteErr) {
      if (deleteErr) return res.status(500).json({ message: deleteErr.message });
      if (this.changes === 0) return res.status(404).json({ message: "المستخدم غير موجود" });
      logActivity({ module: "user", record_id: Number(id), action: "deleted", description: "تم حذف المستخدم", user_id: req.user.id });
      res.json({ message: "تم حذف المستخدم بنجاح" });
    });

    if (user.role !== "admin") return performDelete();
    db.get(`SELECT COUNT(*) AS count FROM users WHERE role = 'admin'`, [], (countErr, result) => {
      if (countErr) return res.status(500).json({ message: countErr.message });
      if (Number(result.count) <= 1) return res.status(400).json({ message: "لا يمكن حذف آخر مدير نظام" });
      performDelete();
    });
  });
};
