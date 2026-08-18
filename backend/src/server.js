const app = require("./app");
const { PORT, NODE_ENV } = require("./config/env");
const { loadConfig, getServerListenHost } = require("../../electron/deployment-config");

const config = loadConfig();
const host = getServerListenHost(config);
const port = Number(process.env.PORT || config.port || PORT || 5000);

const server = app.listen(port, host, () => {
  console.log(`تم تشغيل الخادم على ${host}:${port} (${NODE_ENV})`);
});

module.exports = server;
