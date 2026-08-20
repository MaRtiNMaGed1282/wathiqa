const db = require("../config/sqlite");

const { verifyLicense } = require("../utils/licenseVerifier");

const TRIAL_DAYS = 7;

function readStoredLicense(callback) {
  db.get(
    `
    SELECT *
    FROM license
    LIMIT 1
    `,
    [],
    (err, license) => callback(err, license || null),
  );
}

function getExpiryTimestamp(expiryDate) {
  if (!expiryDate) return null;
  const timestamp = new Date(expiryDate).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function evaluateLicense(license) {
  if (!license) return { valid: false, reason: "NO_LICENSE" };

  if (Number(license.is_active) !== 1) {
    return { valid: false, reason: "INACTIVE" };
  }

  if (!license.payload || !license.signature) {
    return { valid: false, reason: "NO_SIGNATURE" };
  }

  let payload;
  try {
    payload = JSON.parse(license.payload);
  } catch {
    return { valid: false, reason: "INVALID_PAYLOAD" };
  }

  if (!verifyLicense(license.payload, license.signature)) {
    return { valid: false, reason: "INVALID_SIGNATURE" };
  }

  const expiryDate = license.expiry_date || null;
  const expiryTimestamp = getExpiryTimestamp(expiryDate);

  if (expiryDate && expiryTimestamp === null) {
    return { valid: false, reason: "INVALID_EXPIRY" };
  }

  if (expiryTimestamp !== null && expiryTimestamp <= Date.now()) {
    return {
      valid: false,
      reason: "EXPIRED",
      office_name: payload.office,
      license_type: payload.type,
      issued_at: payload.issued_at,
      expiry_date: expiryDate,
    };
  }

  return {
    valid: true,
    office_name: payload.office,
    license_type: payload.type,
    issued_at: payload.issued_at,
    expiry_date: expiryDate,
  };
}

exports.getLicense = (req, res) => {
  db.get(
    `
    SELECT
      id,
      office_name,
      expiry_date,
      is_active,
      created_at
    FROM license
    LIMIT 1
    `,
    [],
    (err, row) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(row || null);
    },
  );
};

// Startup validation is intentionally available before login.
exports.validateLicense = (req, res) => {
  readStoredLicense((err, license) => {
    if (err) return res.status(500).json({ valid: false, reason: "DB_ERROR" });
    return res.json(evaluateLicense(license));
  });
};

exports.activateLicense = (req, res) => {
  const { payload, signature } = req.body || {};

  if (typeof payload !== "string" || typeof signature !== "string") {
    return res.status(400).json({ message: "ملف الترخيص غير صالح" });
  }

  let data;
  try {
    data = JSON.parse(payload);
  } catch {
    return res.status(400).json({ message: "بيانات الترخيص غير صالحة" });
  }

  if (!data || typeof data !== "object" || !data.office || !data.type) {
    return res.status(400).json({ message: "بيانات الترخيص غير صالحة" });
  }

  if (!verifyLicense(payload, signature)) {
    return res.status(400).json({ message: "الترخيص غير صالح" });
  }

  readStoredLicense((readErr, existingLicense) => {
    if (readErr) return res.status(500).json({ message: "تعذر قراءة الترخيص الحالي" });

    let existingPayload = null;
    if (existingLicense?.payload) {
      try {
        existingPayload = JSON.parse(existingLicense.payload);
      } catch (_) {}
    }

    if (data.type === "TRIAL" && existingPayload?.type === "TRIAL") {
      return res.status(409).json({
        message: "تم استخدام الفترة التجريبية المجانية بالفعل",
        code: "TRIAL_ALREADY_USED",
      });
    }

    if (data.type === "TRIAL" && existingPayload?.type === "LIFETIME") {
      return res.status(409).json({
        message: "هذا النظام مفعل بالفعل بترخيص دائم",
        code: "LIFETIME_ALREADY_ACTIVE",
      });
    }

    const activatedAt = new Date();
    const expiryDate =
      data.type === "TRIAL"
        ? new Date(activatedAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
        : data.expiry_date
          ? new Date(data.expiry_date)
          : null;

    if (data.type === "TRIAL" && !Number.isFinite(expiryDate?.getTime())) {
      return res.status(500).json({ message: "تعذر حساب تاريخ انتهاء الفترة التجريبية" });
    }

    if (data.type !== "TRIAL" && data.expiry_date && !Number.isFinite(expiryDate?.getTime())) {
      return res.status(400).json({ message: "تاريخ انتهاء الترخيص غير صالح" });
    }

    db.run(
      `
      UPDATE license
      SET
        office_name = ?,
        payload = ?,
        signature = ?,
        expiry_date = ?,
        is_active = 1
      WHERE id = 1
      `,
      [
        data.office || null,
        payload,
        signature,
        expiryDate ? expiryDate.toISOString() : null,
      ],
      function (err) {
        if (err) return res.status(500).json({ message: err.message });

        if (this.changes === 0) {
          return res.status(500).json({ message: "تعذر حفظ الترخيص" });
        }

        return res.json({
          message:
            data.type === "TRIAL"
              ? `تم تفعيل الفترة التجريبية المجانية لمدة ${TRIAL_DAYS} أيام`
              : "تم التفعيل بنجاح",
          license_type: data.type,
          activated_at: activatedAt.toISOString(),
          expiry_date: expiryDate ? expiryDate.toISOString() : null,
        });
      },
    );
  });
};

exports.getLicenseInfo = (req, res) => {
  db.get(
    `SELECT payload, expiry_date FROM license LIMIT 1`,
    [],
    (err, row) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!row || !row.payload) return res.status(404).json({ message: "لا يوجد ترخيص" });

      try {
        const payload = JSON.parse(row.payload);
        return res.json({
          office: payload.office,
          type: payload.type,
          issued_at: payload.issued_at,
          expiry_date: row.expiry_date || null,
        });
      } catch {
        return res.status(500).json({ message: "بيانات الترخيص غير صالحة" });
      }
    },
  );
};

exports.evaluateLicense = evaluateLicense;
