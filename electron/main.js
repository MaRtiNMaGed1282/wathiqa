const { app, BrowserWindow, Notification, session } = require("electron");
const path = require("path");
const http = require("http");
const { loadConfig, getBackendUrl } = require("./deployment-config");
const { ensureServerSecrets } = require("./server-secrets");
const { loadIdentity } = require("./device-identity");
const { startConnectionMonitor } = require("./connection-monitor");
const { readPackageVersion, getCompatibility } = require("./version-compatibility");

const LOGIN_PAGE = path.join(__dirname, "../frontend/pages/login.html");
const ACTIVATION_PAGE = path.join(__dirname, "../frontend/pages/activation.html");
const APP_ICON = path.join(__dirname, "../assets/wathiqa.ico");
const HEARTBEAT_INTERVAL_MS = 60 * 1000;
const RECOVERY_INTERVAL_MS = 5000;
const APP_VERSION = readPackageVersion();

process.on("uncaughtException", (err) => console.error("UNCAUGHT EXCEPTION:", err));
process.on("unhandledRejection", (err) => console.error("UNHANDLED REJECTION:", err));

let deploymentConfig;
let server;
let heartbeatTimer;
let connectionMonitorStop;
let recoveryTimer;
let startupWindow;
let mainWindow;

function getRuntimeConfig() { if (!deploymentConfig) deploymentConfig = loadConfig(); return deploymentConfig; }
function getRuntimeBackendUrl() { return getBackendUrl(getRuntimeConfig()); }
function loadLocalBackendIfRequired() { const config = getRuntimeConfig(); if (config.mode === "client") return null; const secrets = ensureServerSecrets(); process.env.WATHIQA_SERVER_SECRETS_FILE = secrets.path; server = require("../backend/src/server"); return server; }
function getPreloadArguments() { const config = getRuntimeConfig(); return [`--wathiqa-config=${encodeURIComponent(JSON.stringify(config))}`]; }

function sendHeartbeat() {
  const config = getRuntimeConfig();
  if (config.mode !== "client") return;
  const identity = loadIdentity();
  if (!identity?.deviceToken) return;
  let parsed;
  try { parsed = new URL(`${getRuntimeBackendUrl()}/api/system/devices/heartbeat`); } catch (_) { return; }
  const body = JSON.stringify({ platform: `${process.platform}-${process.arch}`, appVersion: APP_VERSION });
  const request = http.request(parsed, { method: "POST", timeout: 5000, headers: { Accept: "application/json", "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body), "X-Wathiqa-Device-Token": identity.deviceToken } }, (response) => { response.resume(); if (response.statusCode < 200 || response.statusCode >= 300) console.warn(`Wathiqa device heartbeat rejected: HTTP ${response.statusCode}`); });
  request.on("error", (error) => console.warn("Wathiqa device heartbeat failed:", error.message)); request.write(body); request.end();
}
function startHeartbeat() { if (getRuntimeConfig().mode !== "client") return; sendHeartbeat(); heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS); }
function showConnectionNotification(title, body) { if (!Notification.isSupported()) return; try { new Notification({ title, body, icon: APP_ICON }).show(); } catch (error) { console.warn("Unable to show Wathiqa notification:", error.message); } }
function startClientConnectionMonitor() { const config = getRuntimeConfig(); if (config.mode !== "client" || !config.serverUrl) return; connectionMonitorStop = startConnectionMonitor({ serverUrl: config.serverUrl, intervalMs: 15000, onStateChange: ({ state, error }) => { if (state === "offline") showConnectionNotification("Wathiqa server unavailable", "The office server cannot be reached. Wathiqa will keep checking and will reconnect automatically."); else if (state === "online") showConnectionNotification("Wathiqa server connected", "Connection to the office server has been restored."); } }); }

function configureSession() { session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false)); session.defaultSession.webRequest.onHeadersReceived((details, callback) => { const responseHeaders = { ...(details.responseHeaders || {}) }; const connectSource = getRuntimeBackendUrl().replace(/\/$/, ""); responseHeaders["Content-Security-Policy"] = ["default-src 'self' file:; script-src 'self' 'unsafe-inline' chrome://resources; style-src 'self' 'unsafe-inline' chrome://resources; img-src 'self' file: data: blob: chrome://resources; font-src 'self' file: data: blob: chrome://resources; " + `connect-src 'self' ${connectSource}; ` + "object-src 'self' file: blob: data:; base-uri 'self'; frame-src 'self' file: blob: chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai;"]; callback({ responseHeaders }); }); }
function configureNavigation(win) { win.webContents.setWindowOpenHandler(({ url }) => (!url || url === "about:blank" ? { action: "allow" } : { action: "deny" })); win.webContents.on("will-navigate", (event, url) => { if (!url.startsWith("file://")) event.preventDefault(); }); }
function createWindow(page) { mainWindow = new BrowserWindow({ width: 1400, height: 900, minWidth: 1100, minHeight: 700, autoHideMenuBar: true, icon: APP_ICON, webPreferences: { preload: path.join(__dirname, "preload.js"), preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, additionalArguments: getPreloadArguments() } }); mainWindow.maximize(); configureNavigation(mainWindow); mainWindow.loadFile(page); return mainWindow; }
function requestJson(url, timeout = 5000) { return new Promise((resolve, reject) => { let parsed; try { parsed = new URL(url); } catch { reject(new Error("Invalid Wathiqa server URL")); return; } const request = http.request(parsed, { method: "GET", headers: { Accept: "application/json" }, timeout }, (res) => { let data = ""; res.setEncoding("utf8"); res.on("data", (chunk) => { data += chunk; }); res.on("end", () => { let payload = null; try { payload = data ? JSON.parse(data) : null; } catch (_) {} if (res.statusCode >= 200 && res.statusCode < 300) return resolve(payload); const error = new Error(`HTTP ${res.statusCode || 0}`); error.statusCode = res.statusCode || 0; error.payload = payload; reject(error); }); }); request.setTimeout(timeout, () => request.destroy(new Error("Request timeout"))); request.on("error", reject); request.end(); }); }

async function waitForServer(timeout = 15000) {
  const backendUrl = getRuntimeBackendUrl(); const healthUrl = `${backendUrl}/api/system/health`; const start = Date.now(); let lastError;
  while (Date.now() - start <= timeout) {
    try {
      const health = await requestJson(healthUrl, 3000);
      if (health?.status === "ok") {
        if (getRuntimeConfig().mode === "client") {
          const compatibility = getCompatibility(health.version, APP_VERSION);
          if (!compatibility.compatible) { const error = new Error(`Wathiqa client version ${APP_VERSION} is not compatible with server version ${health.version}`); error.code = compatibility.reason; error.serverVersion = health.version; error.clientVersion = APP_VERSION; throw error; }
        }
        return health;
      }
      lastError = new Error("Wathiqa server returned an invalid health response");
    } catch (error) { lastError = error; }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Wathiqa server connection timeout: ${backendUrl} (${lastError?.message || "unknown error"})`);
}
function checkLicense() { return requestJson(`${getRuntimeBackendUrl()}/api/license/validate`, 10000); }
function createStartupErrorWindow(error, options = {}) { const config = getRuntimeConfig(); const isClient = config.mode === "client"; const serverAddress = config.serverUrl || getRuntimeBackendUrl(); const compatibilityError = error?.code === "MAJOR_VERSION_MISMATCH" || error?.code === "INVALID_VERSION"; const title = options.title || (compatibilityError ? "Wathiqa version mismatch" : (isClient ? "Wathiqa server unavailable" : "Wathiqa could not start")); const message = options.message || (compatibilityError ? `This Wathiqa installation is not compatible with the office server.<br><br><strong>Client version:</strong> ${error.clientVersion || APP_VERSION}<br><strong>Server version:</strong> ${error.serverVersion || "Unknown"}<br><br>Please install the same compatible Wathiqa release on this computer.` : isClient ? `This computer is configured as a Wathiqa client, but the office server could not be reached.<br><br><strong>Server:</strong> ${serverAddress}<br><strong>Error:</strong> ${error?.message || "Unknown error"}` : `The Wathiqa application server did not become available.<br><br><strong>Error:</strong> ${error?.message || "Unknown error"}`); startupWindow = new BrowserWindow({ width: 800, height: 500, autoHideMenuBar: true, icon: APP_ICON, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } }); startupWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(`<!doctype html><html lang="en"><body style="font-family:sans-serif;padding:40px"><h2>${title}</h2><p>${message}</p><p>Please verify the Wathiqa server is running and both computers are connected to the same office network.</p><p><strong>Recovery:</strong> Wathiqa will automatically retry the server connection.</p></body></html>`)); return startupWindow; }
function stopRecoveryTimer() { if (recoveryTimer) clearTimeout(recoveryTimer); recoveryTimer = null; }
async function completeClientRecovery() { try { await waitForServer(5000); const license = await checkLicense(); if (!license?.valid) return false; stopRecoveryTimer(); if (startupWindow && !startupWindow.isDestroyed()) startupWindow.close(); startupWindow = null; createWindow(LOGIN_PAGE); startHeartbeat(); startClientConnectionMonitor(); return true; } catch (_) { return false; } }
function startClientRecovery() { if (getRuntimeConfig().mode !== "client") return; stopRecoveryTimer(); const retry = async () => { if (await completeClientRecovery()) return; recoveryTimer = setTimeout(retry, RECOVERY_INTERVAL_MS); }; recoveryTimer = setTimeout(retry, RECOVERY_INTERVAL_MS); }

async function startApplication() {
  deploymentConfig = loadConfig(); loadLocalBackendIfRequired(); configureSession(); await waitForServer();
  let license;
  try { license = await checkLicense(); } catch (error) { if (deploymentConfig.mode === "client") throw new Error(`Unable to validate the office license through the server: ${error.message}`); license = { valid: false }; }
  if (deploymentConfig.mode === "client") { if (!license?.valid) throw new Error("The office Wathiqa license is invalid or expired. License activation must be performed on the main server computer."); createWindow(LOGIN_PAGE); startHeartbeat(); startClientConnectionMonitor(); return; }
  createWindow(license?.valid ? LOGIN_PAGE : ACTIVATION_PAGE);
}

app.whenReady().then(async () => { try { await startApplication(); } catch (error) { console.error(error); createStartupErrorWindow(error); startClientRecovery(); } });
app.on("window-all-closed", () => { if (heartbeatTimer) clearInterval(heartbeatTimer); if (connectionMonitorStop) connectionMonitorStop(); stopRecoveryTimer(); try { if (server) server.close(); } catch (err) { console.error(err); } if (process.platform !== "darwin") app.quit(); });
