const dgram = require("dgram");
const os = require("os");
const { loadConfig } = require("../../../electron/deployment-config");

const DISCOVERY_PORT = 39455;
const DISCOVERY_REQUEST = "WATHIQA_DISCOVERY_REQUEST_V1";
const DISCOVERY_RESPONSE = "WATHIQA_DISCOVERY_RESPONSE_V1";

let socket = null;

function getPreferredAddress() {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal) return entry.address;
    }
  }
  return "127.0.0.1";
}

function getDiscoveryPayload() {
  const config = loadConfig();
  return {
    type: DISCOVERY_RESPONSE,
    version: 1,
    service: "wathiqa",
    serverIdentity: config.serverIdentity || os.hostname(),
    address: getPreferredAddress(),
    port: config.port || 5000,
  };
}

function startNetworkDiscovery() {
  if (socket) return socket;

  const config = loadConfig();
  if (config.mode !== "server") return null;

  socket = dgram.createSocket("udp4");

  socket.on("error", (error) => {
    console.error("Wathiqa network discovery error:", error.message);
  });

  socket.on("message", (message, remote) => {
    if (message.toString("utf8").trim() !== DISCOVERY_REQUEST) return;

    const payload = Buffer.from(JSON.stringify(getDiscoveryPayload()), "utf8");
    socket.send(payload, 0, payload.length, remote.port, remote.address);
  });

  socket.bind(DISCOVERY_PORT, "0.0.0.0", () => {
    try { socket.setBroadcast(true); } catch (_) {}
    console.log(`Wathiqa LAN discovery listening on UDP ${DISCOVERY_PORT}`);
  });

  return socket;
}

function stopNetworkDiscovery() {
  if (!socket) return;
  try { socket.close(); } catch (_) {}
  socket = null;
}

module.exports = {
  DISCOVERY_PORT,
  DISCOVERY_REQUEST,
  DISCOVERY_RESPONSE,
  startNetworkDiscovery,
  stopNetworkDiscovery,
};
