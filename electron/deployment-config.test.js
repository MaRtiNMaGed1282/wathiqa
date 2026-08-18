const assert = require("assert");
const {
  normalizeConfig,
  getApiBaseUrl,
  getBackendUrl,
} = require("./deployment-config");

const standalone = normalizeConfig({ mode: "standalone" });
assert.strictEqual(standalone.mode, "standalone");
assert.strictEqual(getApiBaseUrl(standalone), "/api");
assert.strictEqual(getBackendUrl(standalone), "http://localhost:5000");

const server = normalizeConfig({ mode: "server", port: 5100 });
assert.strictEqual(server.mode, "server");
assert.strictEqual(server.port, 5100);
assert.strictEqual(getApiBaseUrl(server), "/api");
assert.strictEqual(getBackendUrl(server), "http://localhost:5100");

const client = normalizeConfig({
  mode: "client",
  serverUrl: "http://192.168.1.100:5000/",
  serverIdentity: "wathiqa-server",
});
assert.strictEqual(client.mode, "client");
assert.strictEqual(client.serverUrl, "http://192.168.1.100:5000");
assert.strictEqual(getApiBaseUrl(client), "http://192.168.1.100:5000/api");
assert.strictEqual(getBackendUrl(client), "http://192.168.1.100:5000");

assert.throws(
  () => normalizeConfig({ mode: "client" }),
  /requires serverUrl/,
);

assert.throws(
  () => normalizeConfig({ mode: "invalid" }),
  /Invalid Wathiqa deployment mode/,
);

assert.throws(
  () => normalizeConfig({ mode: "client", serverUrl: "ftp://example.com" }),
  /HTTP or HTTPS/,
);

console.log("Deployment configuration tests passed.");
