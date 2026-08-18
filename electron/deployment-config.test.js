const assert = require("assert");
const {
  normalizeConfig,
  getApiBaseUrl,
  getBackendUrl,
  getServerListenHost,
  isPairingTokenValid,
} = require("./deployment-config");

const standalone = normalizeConfig({ mode: "standalone" });
assert.strictEqual(standalone.mode, "standalone");
assert.strictEqual(standalone.host, "127.0.0.1");
assert.strictEqual(getServerListenHost(standalone), "127.0.0.1");
assert.strictEqual(getApiBaseUrl(standalone), "/api");
assert.strictEqual(getBackendUrl(standalone), "http://localhost:5000");

const server = normalizeConfig({ mode: "server", port: 5100 });
assert.strictEqual(server.mode, "server");
assert.strictEqual(server.host, "0.0.0.0");
assert.strictEqual(server.port, 5100);
assert.strictEqual(getServerListenHost(server), "0.0.0.0");
assert.strictEqual(getApiBaseUrl(server), "/api");
assert.strictEqual(getBackendUrl(server), "http://localhost:5100");

const customServer = normalizeConfig({ mode: "server", host: "192.168.1.100", port: 5100 });
assert.strictEqual(customServer.host, "192.168.1.100");
assert.strictEqual(getServerListenHost(customServer), "192.168.1.100");

const client = normalizeConfig({
  mode: "client",
  serverUrl: "http://192.168.1.100:5000/",
  serverIdentity: "wathiqa-server",
});
assert.strictEqual(client.mode, "client");
assert.strictEqual(client.host, null);
assert.strictEqual(client.serverUrl, "http://192.168.1.100:5000");
assert.strictEqual(getApiBaseUrl(client), "http://192.168.1.100:5000/api");
assert.strictEqual(getBackendUrl(client), "http://192.168.1.100:5000");

const pairing = normalizeConfig({
  mode: "server",
  pairingToken: "test-token",
  pairingExpiresAt: new Date(Date.now() + 60_000).toISOString(),
});
assert.strictEqual(isPairingTokenValid(pairing, "test-token"), true);
assert.strictEqual(isPairingTokenValid(pairing, "wrong-token"), false);

const expiredPairing = normalizeConfig({
  mode: "server",
  pairingToken: "test-token",
  pairingExpiresAt: new Date(Date.now() - 60_000).toISOString(),
});
assert.strictEqual(isPairingTokenValid(expiredPairing, "test-token"), false);

assert.throws(() => normalizeConfig({ mode: "client" }), /requires serverUrl/);
assert.throws(() => normalizeConfig({ mode: "invalid" }), /Invalid Wathiqa deployment mode/);
assert.throws(() => normalizeConfig({ mode: "client", serverUrl: "ftp://example.com" }), /HTTP or HTTPS/);

console.log("Deployment configuration tests passed.");
