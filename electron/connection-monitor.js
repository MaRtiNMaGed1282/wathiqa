const http = require("http");

function requestHealth(serverUrl, timeout = 4000) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(`${String(serverUrl).replace(/\/$/, "")}/api/system/health`);
    } catch (error) {
      reject(new Error("Invalid Wathiqa server URL"));
      return;
    }

    const request = http.request(parsed, {
      method: "GET",
      timeout,
      headers: { Accept: "application/json" },
    }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => {
        let payload = null;
        try { payload = body ? JSON.parse(body) : null; } catch (_) {}
        if (response.statusCode >= 200 && response.statusCode < 300 && payload?.status === "ok") {
          resolve(payload);
          return;
        }
        reject(new Error(`HTTP ${response.statusCode || 0}`));
      });
    });

    request.setTimeout(timeout, () => request.destroy(new Error("Request timeout")));
    request.on("error", reject);
    request.end();
  });
}

function startConnectionMonitor({ serverUrl, intervalMs = 15000, onStateChange }) {
  let stopped = false;
  let timer = null;
  let state = "unknown";

  const check = async () => {
    if (stopped) return;
    try {
      await requestHealth(serverUrl);
      if (state !== "online") {
        state = "online";
        onStateChange?.({ state, error: null });
      }
    } catch (error) {
      if (state !== "offline") {
        state = "offline";
        onStateChange?.({ state, error });
      }
    } finally {
      if (!stopped) timer = setTimeout(check, intervalMs);
    }
  };

  check();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}

module.exports = { requestHealth, startConnectionMonitor };
