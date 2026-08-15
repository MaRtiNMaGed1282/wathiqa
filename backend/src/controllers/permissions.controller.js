'use strict';

const db = require('../config/sqlite');
const logActivity = require('../utils/activityLogger');
const { MODULES, ACTIONS, getRoleDefaults } = require('../config/permissions');

function normalizePermissions(input) {
  const allowedModules = new Set(MODULES.map((item) => item.key));
  const allowedActions = new Set(ACTIONS.map((item) => item.key));
  const result = {};

  if (!input || typeof input !== 'object') return result;

  Object.entries(input).forEach(([module, actions]) => {
    if (!allowedModules.has(module) || !actions || typeof actions !== 'object') return;
    result[module] = {};
    allowedActions.forEach((action) => {
      result[module][action] = actions[action] ? 1 : 0;
    });
  });

  return result;
}

exports.getDefinitions = (req, res) => {
  res.json({ modules: MODULES, actions: ACTIONS });
};

exports.getUserPermissions = (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ message: 'معرف المستخدم غير صالح' });

  db.get('SELECT id, role FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) return res.status(500).json({ message: 'تعذر تحميل صلاحيات المستخدم' });
    if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });

    db.all(`
      SELECT module, can_view, can_create, can_edit, can_delete
      FROM user_permissions
      WHERE user_id = ?
      ORDER BY module
    `, [userId], (permissionsErr, rows) => {
      if (permissionsErr) return res.status(500).json({ message: 'تعذر تحميل صلاحيات المستخدم' });

      const defaults = getRoleDefaults(user.role);
      const permissions = {};
      MODULES.forEach(({ key }) => {
        const row = rows.find((item) => item.module === key);
        const fallback = defaults[key] || {};
        permissions[key] = {
          view: Number(row ? row.can_view : fallback.view) === 1,
          create: Number(row ? row.can_create : fallback.create) === 1,
          edit: Number(row ? row.can_edit : fallback.edit) === 1,
          delete: Number(row ? row.can_delete : fallback.delete) === 1,
        };
      });

      res.json({ user_id: userId, role: user.role, permissions });
    });
  });
};

exports.updateUserPermissions = (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ message: 'معرف المستخدم غير صالح' });

  const permissions = normalizePermissions(req.body?.permissions);
  if (!Object.keys(permissions).length) return res.status(400).json({ message: 'لم يتم إرسال صلاحيات صالحة' });

  db.get('SELECT id, role FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) return res.status(500).json({ message: 'تعذر تحديث الصلاحيات' });
    if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });

    // Admin permissions are always unrestricted and cannot be reduced by the matrix.
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'صلاحيات مدير النظام غير قابلة للتقييد' });
    }

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      const statement = db.prepare(`
        INSERT INTO user_permissions
          (user_id, module, can_view, can_create, can_edit, can_delete, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, module) DO UPDATE SET
          can_view = excluded.can_view,
          can_create = excluded.can_create,
          can_edit = excluded.can_edit,
          can_delete = excluded.can_delete,
          updated_at = CURRENT_TIMESTAMP
      `);

      let failed = null;
      MODULES.forEach(({ key }) => {
        const value = permissions[key] || { view: 0, create: 0, edit: 0, delete: 0 };
        statement.run(userId, key, value.view, value.create, value.edit, value.delete, (statementErr) => {
          if (statementErr && !failed) failed = statementErr;
        });
      });

      statement.finalize((finalizeErr) => {
        if (failed || finalizeErr) {
          db.run('ROLLBACK');
          return res.status(500).json({ message: 'تعذر حفظ الصلاحيات' });
        }

        db.run('COMMIT', (commitErr) => {
          if (commitErr) return res.status(500).json({ message: 'تعذر حفظ الصلاحيات' });

          logActivity({
            module: 'user',
            record_id: userId,
            action: 'updated',
            description: 'تم تحديث صلاحيات المستخدم',
            user_id: req.user.id,
          });

          res.json({ message: 'تم حفظ الصلاحيات بنجاح' });
        });
      });
    });
  });
};

exports.updateUser = (req, res) => {
  const userId = Number(req.params.id);
  const { full_name, username, role } = req.body || {};
  const normalizedName = String(full_name || '').trim();
  const normalizedUsername = String(username || '').trim();
  const allowedRoles = new Set(['admin', 'lawyer', 'assistant']);

  if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ message: 'معرف المستخدم غير صالح' });
  if (!normalizedName || normalizedName.length > 120) return res.status(400).json({ message: 'الاسم الكامل غير صالح' });
  if (!/^[A-Za-z0-9_.-]{3,60}$/.test(normalizedUsername)) return res.status(400).json({ message: 'اسم المستخدم غير صالح' });
  if (!allowedRoles.has(role)) return res.status(400).json({ message: 'الدور غير صالح' });

  db.get('SELECT id, role FROM users WHERE id = ?', [userId], (err, target) => {
    if (err) return res.status(500).json({ message: 'تعذر تحديث المستخدم' });
    if (!target) return res.status(404).json({ message: 'المستخدم غير موجود' });

    if (target.role === 'admin' && role !== 'admin') {
      db.get(`SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1`, [], (countErr, result) => {
        if (countErr) return res.status(500).json({ message: 'تعذر التحقق من مديري النظام' });
        if (Number(result.count) <= 1) return res.status(400).json({ message: 'لا يمكن إزالة الدور من آخر مدير نظام نشط' });
        update();
      });
    } else {
      update();
    }

    function update() {
      db.run(`
        UPDATE users
        SET full_name = ?, username = ?, email = ?, role = ?
        WHERE id = ?
      `, [normalizedName, normalizedUsername, `${normalizedUsername}@wathiqa.com`, role, userId], function (updateErr) {
        if (updateErr) {
          const message = String(updateErr.message || '').includes('UNIQUE') ? 'اسم المستخدم مستخدم بالفعل' : 'تعذر تحديث المستخدم';
          return res.status(400).json({ message });
        }

        if (this.changes === 0) return res.status(404).json({ message: 'المستخدم غير موجود' });

        const defaults = getRoleDefaults(role);
        db.serialize(() => {
          const statement = db.prepare(`
            INSERT INTO user_permissions
              (user_id, module, can_view, can_create, can_edit, can_delete, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id, module) DO UPDATE SET
              can_view = excluded.can_view,
              can_create = excluded.can_create,
              can_edit = excluded.can_edit,
              can_delete = excluded.can_delete,
              updated_at = CURRENT_TIMESTAMP
          `);
          MODULES.forEach(({ key }) => {
            const value = defaults[key] || {};
            statement.run(userId, key, value.view || 0, value.create || 0, value.edit || 0, value.delete || 0);
          });
          statement.finalize(() => {
            logActivity({ module: 'user', record_id: userId, action: 'updated', description: 'تم تحديث بيانات المستخدم', user_id: req.user.id });
            res.json({ message: 'تم تحديث المستخدم بنجاح' });
          });
        });
      });
    }
  });
};
