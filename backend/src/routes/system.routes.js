const express = require("express");
const os = require("os");
const {
  loadConfig,
  isPairingTokenValid,
  clearPairingToken,
} = require("../../../electron/deployment-config");

const router = express.Router();

function getDeploymentConfig() {
  try {
    return loadConfig();
  } catch (_) {
    return {
      mode: "standalone",
      serverIdentity: null,
      host: "127.0.0.1",
      port: Number(process.env.PORT || 5000),
      pairingToken: null,
      pairingExpiresAt: null,
    };
  }
}

function getServerIdentity(config) {
  return config.serverIdentity || os.hostname();
}

router.get("/health", (req, res) => {
  const config = getDeploymentConfig();
  res.json({
    success: true,
    status: "ok",
    service: "wathiqa",
    mode: config.mode,
    serverIdentity: getServerIdentity(config),
    timestamp: new Date().toISOString(),
  });
});

router.get("/info", (req, res) => {
  const config = getDeploymentConfig();
  res.json({
    success: true,
    service: "wathiqa",
    mode: config.mode,
    serverIdentity: getServerIdentity(config),
    host: config.host,
    port: config.port,
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
  });
});

router.post("/pair", (req, res) => {
  const config = getDeploymentConfig();

  if (config.mode !== "server") {
    return res.status(409).json({ success: false, message: "هذا الجهاز ليس خادم وثيقة" });
  }

  const token = req.body?.token;
  if (!isPairingTokenValid(config, token)) {
    return res.status(401).json({ success: false, message: "رمز الربط غير صالح أو انتهت صلاحيته" });
  }

  clearPairingToken();

  return res.json({
    success: true,
    paired: true,
    serverIdentity: getServerIdentity(config),
    port: config.port,
    version: process.env.npm_package_version || "1.0.0",
  });
});

module.exports = router;
