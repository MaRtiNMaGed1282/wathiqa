const db = require("../config/sqlite");
const { verifyLicense } = require("../utils/licenseVerifier");

function isLicenseRoute(req) {
  return String(req.originalUrl || "").split("?")[0].startsWith("/api/license");
}

function validateStoredLicense(callback) {
  db.get("SELECT is_active, payload, signature, expiry_date FROM license LIMIT 1", [], (err, license) => {
    if (err) return callback(err, { valid: false, reason: "DB_ERROR" });
    if (!license) return callback(null, { valid: false, reason: "NO_LICENSE" });
    if (Number(license.is_active) !== 1) return callback(null, { valid: false, reason: "INACTIVE" });
    if (!license.payload || !license.signature) return callback(null, { valid: false, reason: "NO_SIGNATURE" });
    if (!verifyLicense(license.payload, license.signature)) return callback(null, { valid: false, reason: "INVALID_SIGNATURE" });

    let payload;
    try {
      payload = JSON.parse(license.payload);
    } catch {
      return callback(null, { valid: false, reason: "INVALID_PAYLOAD" });
    }

    if (license.expiry_date) {
      const expiryTimestamp = new Date(license.expiry_date).getTime();
      if (!Number.isFinite(expiryTimestamp)) return callback(null, { valid: false, reason: "INVALID_EXPIRY" });
      if (expiryTimestamp <= Date.now()) {
        return callback(null, {
          valid: false,
          reason: "EXPIRED",
          license_type: payload.type,
          expiry_date: license.expiry_date,
        });
      }
    }

    return callback(null, {
      valid: true,
      license_type: payload.type,
      expiry_date: license.expiry_date || null,
    });
  });
}

module.exports = (req, res, next) => {
  // Activation and license validation must remain available when no valid
  // license exists, otherwise the user could never activate a trial/license.
  if (isLicenseRoute(req)) return next();

  validateStoredLicense((err, result) => {
    if (err) return res.status(500).json({ message: "تعذر التحقق من الترخيص", code: "LICENSE_CHECK_FAILED" });
    if (result.valid) return next();

    const messages = {
      NO_LICENSE: "لم يتم تفعيل ترخيص النظام",
      INACTIVE: "ترخيص النظام غير نشط",
      NO_SIGNATURE: "بيانات الترخيص غير مكتملة",
      INVALID_SIGNATURE: "توقيع الترخيص غير صالح",
      INVALID_PAYLOAD: "بيانات الترخيص غير صالحة",
      INVALID_EXPIRY: "تاريخ انتهاء الترخيص غير صالح",
      EXPIRED: "انتهت صلاحية الترخيص أو الفترة التجريبية",
    };

    return res.status(403).json({
      message: messages[result.reason] || "الترخيص غير صالح",
      code: result.reason === "EXPIRED" ? "LICENSE_EXPIRED" : "LICENSE_REQUIRED",
      reason: result.reason,
      license_type: result.license_type || null,
      expiry_date: result.expiry_date || null,
    });
  });
};
