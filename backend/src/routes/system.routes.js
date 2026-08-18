const express = require("express");
const os = require("os");

const router = express.Router();

function getDeploymentConfig() {
  try {
    return require("../../../electron/deployment-config").loadConfig();
  } catch (_) {
    return { mode: "standalone", serverIdentity: null, host: "127.0.0.1", port: Number(process.env.PORT || 5000) };
  }
}

router.get("/health", (req, res) => {
  const config = getDeploymentConfig();
  res.json({
    success: true,
    status: "ok",
    service: "wathiqa",
    mode: config.mode,
    serverIdentity: config.serverIdentity || os.hostname(),
    timestamp: new Date().toISOString(),
  });
});

router.get("/info", (req, res) => {
  const config = getDeploymentConfig();
  res.json({
    success: true,
    service: "wathiqa",
    mode: config.mode,
    serverIdentity: config.serverIdentity || os.hostname(),
    host: config.host,
    port: config.port,
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
  });
});

module.exports = router;
