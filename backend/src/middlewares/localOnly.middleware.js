function normalizeIp(ip) {
  if (!ip) return "";
  const value = String(ip).replace(/^::ffff:/, "");
  return value === "::1" ? "127.0.0.1" : value;
}

module.exports = function localOnly(req, res, next) {
  const remoteAddress = normalizeIp(req.socket?.remoteAddress || req.ip);

  if (remoteAddress === "127.0.0.1" || remoteAddress === "0.0.0.0") {
    return next();
  }

  return res.status(403).json({
    message: "لا يمكن تفعيل الترخيص من جهاز عميل. استخدم الكمبيوتر الرئيسي للمكتب.",
    code: "SERVER_ONLY_OPERATION",
  });
};
