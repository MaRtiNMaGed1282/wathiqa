const db = require("../config/sqlite");
const logActivity = require("../utils/activityLogger");
const {
  isEmpty,
  isValidNationalId,
  isValidPhone,
} = require("../utils/validation");

const MAX_ROWS = 5000;
const REQUIRED_FIELDS = ["full_name", "national_id", "phone", "address"];

function normalize(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

function validateRow(row, index) {
  const value = {
    full_name: normalize(row.full_name),
    client_code: normalize(row.client_code),
    national_id: normalize(row.national_id),
    phone: normalize(row.phone),
    address: normalize(row.address),
    notes: normalize(row.notes),
  };

  for (const field of REQUIRED_FIELDS) {
    if (isEmpty(value[field])) {
      return { row: index, message: `${field} مطلوب` };
    }
  }

  if (!isValidNationalId(value.national_id)) {
    return { row: index, message: "الرقم القومي يجب أن يتكون من 14 رقماً" };
  }

  if (!isValidPhone(value.phone)) {
    return { row: index, message: "رقم الهاتف غير صالح" };
  }

  return null;
}

function uniqueConflictMessage(err) {
  const message = String(err?.message || "");
  if (message.includes("clients.client_code")) return "كود الموكل مستخدم مسبقاً";
  if (message.includes("clients.national_id") || message.includes("UNIQUE")) return "الرقم القومي مسجل مسبقاً";
  return "فشل حفظ بيانات الموكل";
}

exports.importClients = async (req, res) => {
  const { rows, duplicateMode } = req.body || {};

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ message: "لا توجد بيانات للاستيراد" });
  }

  if (rows.length > MAX_ROWS) {
    return res.status(400).json({
      message: `الحد الأقصى للاستيراد هو ${MAX_ROWS} صف`,
    });
  }

  if (!["skip", "update"].includes(duplicateMode)) {
    return res.status(400).json({ message: "طريقة التعامل مع المكررات غير صالحة" });
  }

  const errors = [];
  const seenNationalIds = new Set();
  const seenClientCodes = new Set();
  const prepared = [];

  rows.forEach((row, index) => {
    const error = validateRow(row, index + 2);
    if (error) {
      errors.push(error);
      return;
    }

    const normalized = {
      full_name: normalize(row.full_name),
      client_code: normalize(row.client_code),
      national_id: normalize(row.national_id),
      phone: normalize(row.phone),
      address: normalize(row.address),
      notes: normalize(row.notes),
      sourceRow: index + 2,
    };

    if (seenNationalIds.has(normalized.national_id)) {
      errors.push({ row: normalized.sourceRow, message: "الرقم القومي مكرر داخل الملف" });
      return;
    }
    seenNationalIds.add(normalized.national_id);

    if (normalized.client_code) {
      if (seenClientCodes.has(normalized.client_code)) {
        errors.push({ row: normalized.sourceRow, message: "كود الموكل مكرر داخل الملف" });
        return;
      }
      seenClientCodes.add(normalized.client_code);
    }

    prepared.push(normalized);
  });

  const result = {
    total: rows.length,
    added: 0,
    updated: 0,
    skipped: 0,
    failed: errors.length,
    errors,
  };

  try {
    await run("BEGIN TRANSACTION");

    for (const row of prepared) {
      const existing = await get(
        "SELECT id, client_code, notes FROM clients WHERE national_id = ?",
        [row.national_id],
      );

      if (existing) {
        if (duplicateMode === "skip") {
          result.skipped += 1;
          continue;
        }

        if (row.client_code) {
          const codeOwner = await get(
            "SELECT id FROM clients WHERE client_code = ? AND id <> ?",
            [row.client_code, existing.id],
          );
          if (codeOwner) {
            result.failed += 1;
            result.errors.push({ row: row.sourceRow, message: "كود الموكل مستخدم لدى موكل آخر" });
            continue;
          }
        }

        await run(
          `UPDATE clients
           SET full_name = ?,
               phone = ?,
               address = ?,
               client_code = CASE WHEN ? <> '' THEN ? ELSE client_code END,
               notes = CASE WHEN ? <> '' THEN ? ELSE notes END
           WHERE id = ?`,
          [
            row.full_name,
            row.phone,
            row.address,
            row.client_code,
            row.client_code,
            row.notes,
            row.notes,
            existing.id,
          ],
        );

        logActivity({
          module: "client",
          record_id: existing.id,
          action: "updated",
          description: "تم تحديث الموكل عبر الاستيراد الجماعي",
          user_id: req.user.id,
        });
        result.updated += 1;
        continue;
      }

      try {
        const inserted = await run(
          `INSERT INTO clients (client_code, full_name, national_id, phone, address, notes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [row.client_code || null, row.full_name, row.national_id, row.phone, row.address, row.notes || null],
        );

        logActivity({
          module: "client",
          record_id: inserted.lastID,
          action: "created",
          description: "تم إضافة الموكل عبر الاستيراد الجماعي",
          user_id: req.user.id,
        });
        result.added += 1;
      } catch (err) {
        result.failed += 1;
        result.errors.push({ row: row.sourceRow, message: uniqueConflictMessage(err) });
      }
    }

    await run("COMMIT");
  } catch (err) {
    try { await run("ROLLBACK"); } catch (_) {}
    return res.status(500).json({ message: "فشل تنفيذ الاستيراد الجماعي" });
  }

  res.status(200).json({
    message: "تم تنفيذ الاستيراد الجماعي",
    ...result,
  });
};

exports.MAX_ROWS = MAX_ROWS;
