const express = require("express");
const os = require("os");
const { loadConfig, isPairingTokenValid, clearPairingToken } = require("../../../electron/deployment-config");
const { readPackageVersion, getCompatibility } = require("../../../electron/version-compatibility");
const { registerDevice, touchDevice, listDevices, revokeDevice } = require("../services/device.service");

const router = express.Router();
const SERVER_VERSION = readPackageVersion();

function getDeploymentConfig() {
  try { return loadConfig(); } catch (_) {
    return { mode: "standalone", serverIdentity: null, host: "127.0.0.1", port: Number(process.env.PORT || 5000), pairingToken: null, pairingExpiresAt: null };
  }
}
function getServerIdentity(config) { return config.serverIdentity || os.hostname(); }
function getRequestIp(req) { const forwarded = req.headers["x-forwarded-for"]; return String(forwarded || req.socket?.remoteAddress || "").split(",")[0].trim() || null; }
function isLocalRequest(req) { const address = String(req.socket?.remoteAddress || "").replace(/^::ffff:/, ""); return address === "127.0.0.1" || address === "::1" || address === "localhost"; }

router.get("/health", (req, res) => {
  const config = getDeploymentConfig();
  res.json({ success: true, status: "ok", service: "wathiqa", mode: config.mode, serverIdentity: getServerIdentity(config), version: SERVER_VERSION, timestamp: new Date().toISOString() });
});

router.get("/info", (req, res) => {
  const config = getDeploymentConfig();
  res.json({ success: true, service: "wathiqa", mode: config.mode, serverIdentity: getServerIdentity(config), host: config.host, port: config.port, version: SERVER_VERSION, nodeVersion: process.version, platform: process.platform, architecture: process.arch });
});

router.get("/compatibility", (req, res) => {
  const clientVersion = String(req.query?.clientVersion || "").trim();
  const compatibility = getCompatibility(SERVER_VERSION, clientVersion);
  res.status(compatibility.compatible ? 200 : 409).json({ success: compatibility.compatible, compatible: compatibility.compatible, reason: compatibility.reason, serverVersion: SERVER_VERSION, clientVersion });
});

router.post("/pair", async (req, res) => {
  try {
    const config = getDeploymentConfig();
    if (config.mode !== "server") return res.status(409).json({ success: false, message: "هذا الجهاز ليس خادم وثيقة" });
    const clientVersion = String(req.body?.appVersion || "").trim();
    const compatibility = getCompatibility(SERVER_VERSION, clientVersion);
    if (!compatibility.compatible) return res.status(409).json({ success: false, message: "إصدار وثيقة على هذا الجهاز غير متوافق مع خادم المكتب", reason: compatibility.reason, serverVersion: SERVER_VERSION, clientVersion });
    if (!isPairingTokenValid(config, req.body?.token)) return res.status(401).json({ success: false, message: "رمز الربط غير صالح أو انتهت صلاحيته" });
    const device = await registerDevice({ deviceName: req.body?.deviceName, ipAddress: getRequestIp(req), platform: req.body?.platform, appVersion: clientVersion });
    clearPairingToken();
    return res.json({ success: true, paired: true, serverIdentity: getServerIdentity(config), port: config.port, version: SERVER_VERSION, deviceId: device.deviceId, deviceToken: device.deviceToken, deviceName: device.deviceName });
  } catch (error) {
    console.error("فشل ربط جهاز المكتب:", error.message);
    return res.status(500).json({ success: false, message: "تعذر تسجيل الجهاز" });
  }
});

router.post("/devices/heartbeat", async (req, res) => {
  try {
    const deviceToken = req.headers["x-wathiqa-device-token"];
    if (!deviceToken) return res.status(401).json({ success: false, message: "رمز الجهاز مفقود" });
    const clientVersion = String(req.body?.appVersion || "").trim();
    const updated = await touchDevice(deviceToken, { ipAddress: getRequestIp(req), platform: req.body?.platform, appVersion: clientVersion });
    if (!updated) return res.status(401).json({ success: false, message: "الجهاز غير مسجل أو تم إلغاؤه" });
    const compatibility = getCompatibility(SERVER_VERSION, clientVersion);
    if (!compatibility.compatible) return res.status(409).json({ success: false, compatible: false, reason: compatibility.reason, serverVersion: SERVER_VERSION });
    return res.json({ success: true, status: "online", compatible: true, serverVersion: SERVER_VERSION, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("فشل تحديث حالة جهاز المكتب:", error.message);
    return res.status(500).json({ success: false, message: "تعذر تحديث حالة الجهاز" });
  }
});

router.get("/devices", async (req, res) => {
  if (!isLocalRequest(req)) return res.status(403).json({ success: false, message: "إدارة الأجهزة متاحة من خادم المكتب فقط" });
  try { return res.json({ success: true, devices: await listDevices() }); }
  catch (error) { console.error("فشل قراءة أجهزة المكتب:", error.message); return res.status(500).json({ success: false, message: "تعذر قراءة الأجهزة" }); }
});

router.delete("/devices/:deviceId", async (req, res) => {
  if (!isLocalRequest(req)) return res.status(403).json({ success: false, message: "إدارة الأجهزة متاحة من خادم المكتب فقط" });
  try {
    const revoked = await revokeDevice(req.params.deviceId);
    if (!revoked) return res.status(404).json({ success: false, message: "الجهاز غير موجود" });
    return res.json({ success: true, revoked: true });
  } catch (error) { console.error("فشل إلغاء جهاز المكتب:", error.message); return res.status(500).json({ success: false, message: "تعذر إلغاء الجهاز" }); }
});

module.exports = router;
