const db = require("../config/sqlite");

const { verifyLicense } = require("../utils/licenseVerifier");

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

exports.validateLicense = (req, res) => {
  db.get(
    `
    SELECT *
    FROM license
    LIMIT 1
    `,
    [],
    (err, license) => {
      if (err) {
        return res.status(500).json({
          valid: false,
        });
      }

      if (!license) {
        return res.json({
          valid: false,
          reason: "NO_LICENSE",
        });
      }

      if (!license.payload || !license.signature) {
        return res.json({
          valid: false,
          reason: "NO_SIGNATURE",
        });
      }

      const validSignature = verifyLicense(license.payload, license.signature);

      if (!validSignature) {
        return res.json({
          valid: false,
          reason: "INVALID_SIGNATURE",
        });
      }

      const payload = JSON.parse(license.payload);

      res.json({
        valid: true,
        office_name: payload.office,
        license_type: payload.type,
      });
    },
  );
};
exports.activateLicense = (req, res) => {
  const { payload, signature } = req.body;

  const valid = verifyLicense(payload, signature);

  if (!valid) {
    return res.status(400).json({
      message: "ترخيص غير صالح",
    });
  }

  const data = JSON.parse(payload);

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
    [data.office, payload, signature],
    (err) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
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

      const payload = JSON.parse(row.payload);

      res.json({
        office: payload.office,
        type: payload.type,
        issued_at: payload.issued_at,
      });
    },
  );
};
