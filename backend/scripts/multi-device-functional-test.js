const assert = require("assert");
const http = require("http");

const SERVER_URL = String(process.env.WATHIQA_TEST_SERVER_URL || "http://127.0.0.1:5000").replace(/\/$/, "");
const CLIENT_VERSION = String(process.env.WATHIQA_TEST_CLIENT_VERSION || "1.0.0");
const DEVICE_TOKEN = process.env.WATHIQA_TEST_DEVICE_TOKEN || null;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SERVER_URL}${path}`);
    const payload = body === null ? null : JSON.stringify(body);
    const request = http.request(url, {
      method,
      timeout: 5000,
      headers: {
        Accept: "application/json",
        ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}),
        ...headers,
      },
    }, (response) => {
      let data = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { data += chunk; });
      response.on("end", () => {
        let parsed = null;
        try { parsed = data ? JSON.parse(data) : null; } catch (_) {}
        resolve({ status: response.statusCode, body: parsed });
      });
    });
    request.on("timeout", () => request.destroy(new Error("request timeout")));
    request.on("error", reject);
    if (payload) request.write(payload);
    request.end();
  });
}

async function expect(label, fn) {
  const result = await fn();
  console.log(`PASS  ${label}`);
  return result;
}

async function main() {
  console.log(`Testing Wathiqa multi-device server: ${SERVER_URL}`);

  const health = await expect("server health", async () => {
    const result = await request("GET", "/api/system/health");
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.body?.status, "ok");
    assert.ok(result.body?.serverIdentity);
    assert.ok(result.body?.version);
    return result;
  });

  await expect("server information", async () => {
    const result = await request("GET", "/api/system/info");
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.body?.service, "wathiqa");
    assert.strictEqual(result.body?.version, health.body.version);
    assert.ok(Number(result.body?.port) > 0);
    return result;
  });

  await expect("compatible client is accepted", async () => {
    const result = await request("GET", `/api/system/compatibility?clientVersion=${encodeURIComponent(CLIENT_VERSION)}`);
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.body?.compatible, true);
    return result;
  });

  await expect("incompatible major client is rejected", async () => {
    const serverMajor = String(health.body.version).split(".")[0];
    const incompatibleMajor = serverMajor === "1" ? "2" : "1";
    const result = await request("GET", `/api/system/compatibility?clientVersion=${incompatibleMajor}.0.0`);
    assert.strictEqual(result.status, 409);
    assert.strictEqual(result.body?.compatible, false);
    return result;
  });

  if (DEVICE_TOKEN) {
    await expect("registered client heartbeat", async () => {
      const result = await request("POST", "/api/system/devices/heartbeat", {
        platform: `${process.platform}-${process.arch}`,
        appVersion: CLIENT_VERSION,
      }, { "X-Wathiqa-Device-Token": DEVICE_TOKEN });
      assert.strictEqual(result.status, 200);
      assert.strictEqual(result.body?.compatible, true);
      return result;
    });

    const concurrentResults = await Promise.all([
      request("GET", "/api/system/health"),
      request("GET", "/api/system/info"),
      request("GET", `/api/system/compatibility?clientVersion=${encodeURIComponent(CLIENT_VERSION)}`),
    ]);
    concurrentResults.forEach((result) => assert.ok(result.status >= 200 && result.status < 300));
    console.log("PASS  concurrent client/server requests");
  } else {
    console.log("SKIP  device heartbeat (set WATHIQA_TEST_DEVICE_TOKEN after pairing)");
    console.log("SKIP  authenticated multi-record checks (requires a paired device/user token)");
  }

  console.log("\nMulti-device functional harness completed.");
  console.log("Physical two-PC/three-PC workflows still require Windows LAN execution.");
}

main().catch((error) => {
  console.error(`FAIL  ${error.message}`);
  process.exitCode = 1;
});
