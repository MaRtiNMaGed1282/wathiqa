const app = require("./app");
const { PORT, NODE_ENV } = require("./config/env");
const { loadConfig, getServerListenHost } = require("../../electron/deployment-config");
const { startNetworkDiscovery, stopNetworkDiscovery } = require("./services/networkDiscovery.service");

const config = loadConfig();
const host = getServerListenHost(config);
const port = Number(process.env.PORT || config.port || PORT || 5000);

const server = app.listen(port, host, () => {
  console.log(`تم تشغيل الخادم على ${host}:${port} (${NODE_ENV})`);
  if (config.mode === "server") startNetworkDiscovery();
});

server.on("close", () => stopNetworkDiscovery());

module.exports = server;
