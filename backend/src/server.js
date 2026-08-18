const app = require("./app");

function getServerBinding() {
  let configuredHost = process.env.WATHIQA_HOST;
  let configuredPort = process.env.PORT;

  if (!configuredHost) {
    try {
      const deployment = require("../../electron/deployment-config").loadConfig();
      configuredHost = deployment.host;
      configuredPort = configuredPort || deployment.port;
    } catch (_) {
      configuredHost = "127.0.0.1";
    }
  }

  const host = configuredHost || "127.0.0.1";
  const port = Number(configuredPort || 5000);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port");
  }

  return { host, port };
}

const { host, port } = getServerBinding();

module.exports = app.listen(port, host, () => {
  console.log(`تم تشغيل الخادم على ${host}:${port}`);
});
