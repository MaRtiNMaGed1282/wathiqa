const { app, BrowserWindow, ipcMain, shell, session } = require("electron");
const os = require("os");
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const { loadConfig, saveConfig, normalizeConfig, DEFAULT_PORT } = require("./deployment-config");

const APP_ICON = path.join(__dirname, "../assets/wathiqa.ico");
const SETUP_PAGE = path.join(__dirname, "setup-ui/index.html");
const SHARED_USER_DATA = path.join(app.getPath("appData"), "Wathiqa");

app.setPath("userData", SHARED_USER_DATA);
app.setName("Wathiqa");

process.on("uncaughtException", (error) => console.error("SETUP UNCAUGHT EXCEPTION:", error));
process.on("unhandledRejection", (error) => console.error("SETUP UNHANDLED REJECTION:", error));

function requestJson(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    let parsed;
    try { parsed = new URL(url); } catch { reject(new Error("عنوان الخادم غير صالح")); return; }
    const transport = parsed.protocol === "https:" ? https : http;
    const request = transport.get(parsed, (response) => {
      let data = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { data += chunk; });
      response.on("end", () => {
        let payload = null;
        try { payload = data ? JSON.parse(data) : null; } catch (_) {}
        if (response.statusCode >= 200 && response.statusCode < 300) return resolve(payload);
        reject(new Error(`HTTP ${response.statusCode || 0}`));
      });
    });
    request.setTimeout(timeout, () => request.destroy(new Error("انتهت مهلة الاتصال")));
    request.on("error", reject);
  });
}

function getLocalNetworkInfo() {
  const addresses = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal) addresses.push(entry.address);
    }
  }
  return { hostname: os.hostname(), addresses: [...new Set(addresses)], preferredAddress: addresses[0] || "127.0.0.1" };
}

async function testServer(serverUrl) {
  const base = String(serverUrl || "").trim().replace(/\/+$/, "");
  if (!base) throw new Error("أدخل عنوان خادم Wathiqa");
  const normalized = normalizeConfig({ mode: "client", serverUrl: base });
  const health = await requestJson(`${normalized.serverUrl}/api/system/health`, 5000);
  let info = null;
  try { info = await requestJson(`${normalized.serverUrl}/api/system/info`, 5000); } catch (_) {}
  return {
    success: true,
    serverUrl: normalized.serverUrl,
    health,
    info,
    checks: { server: health?.status === "ok", database: health?.status === "ok" },
  };
}

function getFirewallDiagnostics(port) {
  return {
    status: "not_checked",
    message: `Windows Firewall automation is intentionally deferred to Phase 7. Verify that TCP port ${port} is allowed on the office LAN before connecting clients.`,
  };
}

function getWathiqaExecutableCandidates() {
  if (process.platform !== "win32") return [];
  const candidates = [
    path.join(process.env.LOCALAPPDATA || "", "Programs", "Wathiqa", "Wathiqa.exe"),
    path.join(process.env.ProgramFiles || "", "Wathiqa", "Wathiqa.exe"),
    path.join(process.env["ProgramFiles(x86)"] || "", "Wathiqa", "Wathiqa.exe"),
  ];
  return [...new Set(candidates.filter(Boolean))];
}

async function launchWathiqa() {
  const candidates = getWathiqaExecutableCandidates();
  const executable = candidates.find((candidate) => fs.existsSync(candidate));
  if (!executable) {
    return { launched: false, message: "Wathiqa.exe was not found in the standard installation locations. Use the Wathiqa shortcut from Windows." };
  }
  const error = await shell.openPath(executable);
  if (error) return { launched: false, message: error };
  return { launched: true, path: executable };
}

function registerIpc() {
  ipcMain.handle("setup:get-state", () => {
    let config;
    try { config = loadConfig(); }
    catch (error) {
      config = { mode: "standalone", host: "127.0.0.1", serverUrl: null, serverIdentity: null, port: DEFAULT_PORT };
      console.error(error);
    }
    return { config, network: getLocalNetworkInfo(), firewall: getFirewallDiagnostics(config.port || DEFAULT_PORT) };
  });

  ipcMain.handle("setup:save-standalone", (_event, payload = {}) => saveConfig({
    mode: "standalone", host: "127.0.0.1", serverUrl: null,
    serverIdentity: payload.serverIdentity || null, port: payload.port || DEFAULT_PORT,
  }));

  ipcMain.handle("setup:save-server", (_event, payload = {}) => {
    const config = saveConfig({
      mode: "server", host: "0.0.0.0", serverUrl: null,
      serverIdentity: payload.serverIdentity || os.hostname(), port: payload.port || DEFAULT_PORT,
    });
    return { config, network: getLocalNetworkInfo(), firewall: getFirewallDiagnostics(config.port) };
  });

  ipcMain.handle("setup:test-server", (_event, payload = {}) => testServer(payload.serverUrl));

  ipcMain.handle("setup:save-client", (_event, payload = {}) => {
    if (!payload.serverUrl) throw new Error("serverUrl is required");
    return saveConfig({
      mode: "client", host: null, serverUrl: payload.serverUrl,
      serverIdentity: payload.serverIdentity || null, port: payload.port || DEFAULT_PORT,
    });
  });

  ipcMain.handle("setup:launch-wathiqa", () => launchWathiqa());
}

function createWindow() {
  const window = new BrowserWindow({
    width: 980, height: 720, minWidth: 860, minHeight: 640, resizable: false,
    autoHideMenuBar: true, backgroundColor: "#f7f8fa", icon: APP_ICON,
    webPreferences: { preload: path.join(__dirname, "setup-preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => { if (!url.startsWith("file://")) event.preventDefault(); });
  window.loadFile(SETUP_PAGE);
}

app.whenReady().then(() => {
  registerIpc();
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...(details.responseHeaders || {}) };
    headers["Content-Security-Policy"] = [
      "default-src 'self' file:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' file: data:; font-src 'self' file: data:; connect-src 'self'; object-src 'none'; base-uri 'self';",
    ];
    callback({ responseHeaders: headers });
  });
  createWindow();
});

app.on("window-all-closed", () => app.quit());
