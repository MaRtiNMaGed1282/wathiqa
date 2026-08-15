'use strict';

const db = require('../config/sqlite');
const logActivity = require('../utils/activityLogger');
const { createNotification } = require('../utils/notificationService');
const { ENTITY_CONFIG, ensureArchiveTable, getConfig, getRecord } = require('../services/archive.service');

ensureArchiveTable();

function validId(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

exports.listArchived = (req, res) => {
  const type = req.query.type ? String(req.query.type).toLowerCase() : '';
  const conditions = ['ar.restored_at IS NULL'];
  const params = [];

  if (type) {
    if (!ENTITY_CONFIG[type]) return res.status(400).json({ message: 'نوع السجل غير صالح' });
    conditions.push('ar.entity_type = ?');
    params.push(type);
  }

  db.all(`
    SELECT ar.id, ar.entity_type, ar.record_id, ar.reason, ar.archived_by,
           ar.archived_at, u.full_name AS archived_by_name
    FROM archived_records ar
    LEFT JOIN users u ON u.id = ar.archived_by
    WHERE ${conditions.join(' AND ')}
    ORDER BY datetime(ar.archived_at) DESC, ar.id DESC
  `, params, (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows || []);
  });
};

exports.archive = async (req, res) => {
  const { entityType, recordId } = req.body;
  if (!validId(recordId)) return res.status(400).json({ message: 'رقم السجل غير صالح' });

  try {
    getConfig(entityType);
    const record = await getRecord(entityType, Number(recordId));
    if (!record) return res.status(404).json({ message: 'السجل غير موجود' });

    db.run(
      `INSERT INTO archived_records (entity_type, record_id, reason, archived_by) VALUES (?, ?, ?, ?)`,
      [String(entityType).toLowerCase(), Number(recordId), req.body.reason || null, req.user.id],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) return res.status(409).json({ message: 'السجل مؤرشف بالفعل' });
          return res.status(500).json({ message: err.message });
        }

        logActivity({
          module: 'archive', record_id: Number(recordId), action: 'archived',
          description: `تم أرشفة ${entityType}: ${record.label || record.id}`,
          user_id: req.user.id,
        });
        createNotification({
          title: 'تمت أرشفة سجل',
          message: `تمت أرشفة ${record.label || record.id}`,
          type: 'info', module: String(entityType).toLowerCase(), record_id: Number(recordId), user_id: req.user.id,
        });
        return res.status(201).json({ message: 'تمت الأرشفة بنجاح', archive_id: this.lastID });
      },
    );
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.status ? error.message : 'فشل تنفيذ الأرشفة' });
  }
};

exports.restore = (req, res) => {
  const { id } = req.params;
  if (!validId(id)) return res.status(400).json({ message: 'رقم الأرشيف غير صالح' });

  db.get(`SELECT * FROM archived_records WHERE id = ? AND restored_at IS NULL`, [Number(id)], (findErr, archive) => {
    if (findErr) return res.status(500).json({ message: findErr.message });
    if (!archive) return res.status(404).json({ message: 'السجل المؤرشف غير موجود' });

    db.run(
      `UPDATE archived_records SET restored_by = ?, restored_at = CURRENT_TIMESTAMP WHERE id = ? AND restored_at IS NULL`,
      [req.user.id, Number(id)],
      function (err) {
        if (err) return res.status(500).json({ message: err.message });
        if (!this.changes) return res.status(404).json({ message: 'السجل المؤرشف غير موجود' });

        logActivity({
          module: 'archive', record_id: archive.record_id, action: 'restored',
          description: `تم استعادة السجل المؤرشف (${archive.entity_type})`, user_id: req.user.id,
        });
        return res.json({ message: 'تمت استعادة السجل بنجاح' });
      },
    );
  });
};
