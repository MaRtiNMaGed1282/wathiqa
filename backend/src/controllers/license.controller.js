const db = require("../config/sqlite");

const { verifyLicense } = require("../utils/licenseVerifier");

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

  return {
    valid: true,
    office_name: payload.office,
    license_type: payload.type,
    issued_at: payload.issued_at,
    expiry_date: license.expiry_date || null,
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
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      res.json(row || null);
    },
  );
};

// Startup-safe validation: this endpoint intentionally does not require login.
// Electron must be able to determine whether a persisted license is valid before
// the login screen is shown.
exports.validateLicense = (req, res) => {
  readStoredLicense((err, license) => {
    if (err) {
      return res.status(500).json({
        valid: false,
        reason: "DB_ERROR",
      });
    }

    return res.json(evaluateLicense(license));
  });
};

exports.activateLicense = (req, res) => {
  const { payload, signature } = req.body || {};

  if (typeof payload !== "string" || typeof signature !== "string") {
    return res.status(400).json({
      message: "ملف الترخيص غير صالح",
    });
  }

  let data;
  try {
    data = JSON.parse(payload);
  } catch {
    return res.status(400).json({
      message: "بيانات الترخيص غير صالحة",
    });
  }

  if (!verifyLicense(payload, signature)) {
    return res.status(400).json({
      message: "ترخيص غير صالح",
    });
  }

  db.run(
    `
    UPDATE license
    SET
      office_name = ?,
      payload = ?,
      signature = ?,
      is_active = 1
    WHERE id = 1
    `,
    [data.office || null, payload, signature],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      if (this.changes === 0) {
        return res.status(500).json({
          message: "تعذر حفظ الترخيص",
        });
      }

      res.json({
        message: "تم التفعيل بنجاح",
      });
    },
  );
};

exports.getLicenseInfo = (req, res) => {
  db.get(
    `
    SELECT payload
    FROM license
    LIMIT 1
    `,
    [],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      if (!row || !row.payload) {
        return res.status(404).json({
          message: "No license found",
        });
      }

      try {
        const payload = JSON.parse(row.payload);
        return res.json({
          office: payload.office,
          type: payload.type,
          issued_at: payload.issued_at,
        });
      } catch {
        return res.status(500).json({
          message: "بيانات الترخيص غير صالحة",
        });
      }
    },
  );
};
