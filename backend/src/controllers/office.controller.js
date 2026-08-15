const fs = require("fs");
const path = require("path");
const db = require("../config/sqlite");
const logActivity = require("../utils/activityLogger");
const { createNotification } = require("../utils/notificationService");
const { getUploadsRoot } = require("../utils/storagePaths");

const UPLOADS_ROOT = getUploadsRoot();

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validateOfficePayload(body = {}) {
  const values = {
    office_name: cleanString(body.office_name),
    owner_name: cleanString(body.owner_name),
    phone: cleanString(body.phone),
    secondary_phone: cleanString(body.secondary_phone),
    email: cleanString(body.email),
    address: cleanString(body.address),
    tax_number: cleanString(body.tax_number),
    commercial_register: cleanString(body.commercial_register),
    license_number: cleanString(body.license_number),
  };

  const errors = [];
  if (values.office_name && values.office_name.length > 255) errors.push("اسم المكتب طويل جداً");
  if (values.owner_name.length > 255) errors.push("اسم المحامي المسؤول طويل جداً");
  if (values.phone.length > 50 || values.secondary_phone.length > 50) errors.push("رقم الهاتف غير صالح");
  if (values.email && !/^\S+@\S+\.\S+$/.test(values.email)) errors.push("البريد الإلكتروني غير صالح");
  if (values.address.length > 1000) errors.push("العنوان طويل جداً");
  if (values.tax_number.length > 100) errors.push("الرقم الضريبي غير صالح");
  if (values.commercial_register.length > 100) errors.push("رقم السجل التجاري غير صالح");
  if (values.license_number.length > 100) errors.push("رقم الترخيص غير صالح");

  return { values, errors };
}

function getOfficeRow(callback) {
  db.get(`SELECT * FROM office_settings LIMIT 1`, [], callback);
}

function existingAssetFilename(filename) {
  if (!filename || path.basename(filename) !== filename || filename.includes("..")) {
    return null;
  }

  const filePath = path.resolve(UPLOADS_ROOT, filename);
  if (!filePath.startsWith(`${UPLOADS_ROOT}${path.sep}`) || !fs.existsSync(filePath)) {
    return null;
  }

  return filename;
}

exports.getOfficeSettings = (req, res) => {
  getOfficeRow((err, row) => {
    if (err) return res.status(500).json({ message: err.message });

    if (!row) return res.json({});

    res.json({
      ...row,
      logo_path: existingAssetFilename(row.logo_path),
      stamp_path: existingAssetFilename(row.stamp_path),
    });
  });
};

exports.saveOfficeSettings = (req, res) => {
  const { values, errors } = validateOfficePayload(req.body);

  if (errors.length) {
    return res.status(400).json({ message: errors[0], errors });
  }

  getOfficeRow((err, row) => {
    if (err) return res.status(500).json({ message: err.message });

    const params = [
      values.office_name,
      values.owner_name,
      values.phone,
      values.secondary_phone,
      values.email,
      values.address,
      values.tax_number,
      values.commercial_register,
      values.license_number,
    ];

    const finish = (recordId, action, message) => {
      logActivity({
        module: "office",
        record_id: recordId,
        action,
        description: message,
        user_id: req.user.id,
      });
      res.json({ message });
    };

    if (row) {
      db.run(
        `UPDATE office_settings SET office_name=?, owner_name=?, phone=?, secondary_phone=?, email=?, address=?, tax_number=?, commercial_register=?, license_number=? WHERE id=?`,
        [...params, row.id],
        function (updateErr) {
          if (updateErr) return res.status(500).json({ message: updateErr.message });
          if (this.changes === 0) return res.status(404).json({ message: "بيانات المكتب غير موجودة" });
          finish(row.id, "updated", "تم حفظ بيانات المكتب بنجاح");
        },
      );
      return;
    }

    db.run(
      `INSERT INTO office_settings (office_name, owner_name, phone, secondary_phone, email, address, tax_number, commercial_register, license_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params,
      function (insertErr) {
        if (insertErr) return res.status(500).json({ message: insertErr.message });
        finish(this.lastID, "created", "تم حفظ بيانات المكتب بنجاح");
      },
    );
  });
};

exports.uploadOfficeAssets = (req, res) => {
  const logoFile = req.files?.logo?.[0] || null;
  const stampFile = req.files?.stamp?.[0] || null;

  if (!logoFile && !stampFile) {
    return res.status(400).json({ message: "يرجى اختيار شعار أو ختم" });
  }

  const invalidImage = [logoFile, stampFile].find(
    (file) => file && !["image/png", "image/jpeg"].includes(file.mimetype),
  );

  if (invalidImage) {
    if (logoFile) fs.rmSync(logoFile.path, { force: true });
    if (stampFile) fs.rmSync(stampFile.path, { force: true });
    return res.status(400).json({ message: "الشعار والختم يجب أن يكونا PNG أو JPG" });
  }

  getOfficeRow((err, row) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!row) return res.status(400).json({ message: "يجب حفظ بيانات المكتب أولاً" });

    const logo = logoFile?.filename || null;
    const stamp = stampFile?.filename || null;

    db.run(
      `UPDATE office_settings SET logo_path = COALESCE(?, logo_path), stamp_path = COALESCE(?, stamp_path) WHERE id = ?`,
      [logo, stamp, row.id],
      function (updateErr) {
        if (updateErr) return res.status(500).json({ message: updateErr.message });
        if (this.changes === 0) return res.status(404).json({ message: "بيانات المكتب غير موجودة" });

        logActivity({
          module: "office",
          record_id: row.id,
          action: "updated",
          description: "تم تحديث الهوية البصرية للمكتب",
          user_id: req.user.id,
        });

        createNotification({
          title: "تحديث هوية المكتب",
          message: "تم تحديث شعار أو ختم المكتب",
          type: "info",
          module: "office",
          record_id: row.id,
          user_id: req.user.id,
        }).catch(() => {});

        res.json({ message: "تم رفع الملفات بنجاح", logo, stamp });
      },
    );
  });
};

exports.getOfficeAsset = (req, res) => {
  const type = req.params.type;
  if (type !== "logo" && type !== "stamp") {
    return res.status(404).json({ message: "الملف غير موجود" });
  }

  getOfficeRow((err, row) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!row) return res.status(404).json({ message: "بيانات المكتب غير موجودة" });

    const filename = existingAssetFilename(row[type === "logo" ? "logo_path" : "stamp_path"]);
    if (!filename) {
      return res.status(404).json({ message: "الملف غير موجود" });
    }

    const filePath = path.resolve(UPLOADS_ROOT, filename);
    res.sendFile(filePath);
  });
};
