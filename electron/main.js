const { app, BrowserWindow, session } = require("electron");
const path = require("path");
const http = require("http");
const { loadConfig, getBackendUrl } = require("./deployment-config");
const { ensureServerSecrets } = require("./server-secrets");
const { loadIdentity } = require("./device-identity");

const LOGIN_PAGE = path.join(__dirname, "../frontend/pages/login.html");
const ACTIVATION_PAGE = path.join(__dirname, "../frontend/pages/activation.html");
const APP_ICON = path.join(__dirname, "../assets/wathiqa.ico");
const HEARTBEAT_INTERVAL_MS = 60 * 1000;

process.on("uncaughtException", (err) => console.error("UNCAUGHT EXCEPTION:", err));
process.on("unhandledRejection", (err) => console.error("UNHANDLED REJECTION:", err));
let deploymentConfig;
let server;
let heartbeatTimer;
function getRuntimeConfig() { if (!deploymentConfig) deploymentConfig = loadConfig(); return deploymentConfig; }
function getRuntimeBackendUrl() { return getBackendUrl(getRuntimeConfig()); }
function loadLocalBackendIfRequired() { const config = getRuntimeConfig(); if (config.mode === "client") return null; const secrets = ensureServerSecrets(); process.env.WATHIQA_SERVER_SECRETS_FILE = secrets.path; server = require("../backend/src/server"); return server; }

function sendHeartbeat() {
  const config = getRuntimeConfig();
  if (config.mode !== "client") return;
  const identity = loadIdentity();
  if (!identity?.deviceToken) return;
  let parsed;
  try { parsed = new URL(`${getRuntimeBackendUrl()}/api/system/devices/heartbeat`); } catch (_) { return; }
  const body = JSON.stringify({ platform: `${process.platform}-${process.arch}`, appVersion: app.getVersion() });
  const request = http.request(parsed, { method: "POST", timeout: 5000, headers: { Accept: "application/json", "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body), "X-Wathiqa-Device-Token": identity.deviceToken } }, (response) => response.resume());
  request.on("error", (error) => console.warn("Wathiqa device heartbeat failed:", error.message));
  request.write(body);
  request.end();
}
function startHeartbeat() { if (getRuntimeConfig().mode !== "client") return; sendHeartbeat(); heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS); }

function configureSession() { session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false)); session.defaultSession.webRequest.onHeadersReceived((details, callback) => { const responseHeaders = { ...(details.responseHeaders || {}) }; const connectSource = getRuntimeBackendUrl().replace(/\/$/, ""); responseHeaders["Content-Security-Policy"] = ["default-src 'self' file:; script-src 'self' 'unsafe-inline' chrome://resources; style-src 'self' 'unsafe-inline' chrome://resources; img-src 'self' file: data: blob: chrome://resources; font-src 'self' file: data: blob: chrome://resources; " + `connect-src 'self' ${connectSource}; ` + "object-src 'self' file: blob: data:; base-uri 'self'; frame-src 'self' file: blob: chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai;"]; callback({ responseHeaders }); }); }
function configureNavigation(win) { win.webContents.setWindowOpenHandler(({ url }) => (!url || url === "about:blank" ? { action: "allow" } : { action: "deny" })); win.webContents.on("will-navigate", (event, url) => { if (!url.startsWith("file://")) event.preventDefault(); }); }
function createWindow(page) { const win = new BrowserWindow({ width: 1400, height: 900, minWidth: 1100, minHeight: 700, autoHideMenuBar: true, icon: APP_ICON, webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true } }); win.maximize(); configureNavigation(win); win.loadFile(page); }
function requestJson(url, timeout = 5000) { return new Promise((resolve, reject) => { let parsed; try { parsed = new URL(url); } catch { reject(new Error("Invalid Wathiqa server URL")); return; } const request = http.request(parsed, { method: "GET", headers: { Accept: "application/json" } }, (res) => { let data = ""; res.setEncoding("utf8"); res.on("data", (chunk) => { data += chunk; }); res.on("end", () => { let payload = null; try { payload = data ? JSON.parse(data) : null; } catch (_) {} if (res.statusCode >= 200 && res.statusCode < 300) return resolve(payload); const error = new Error(`HTTP ${res.statusCode || 0}`); error.statusCode = res.statusCode || 0; reject(error); }); }); request.setTimeout(timeout, () => request.destroy(new Error("Request timeout"))); request.on("error", reject); request.end(); }); }
async function waitForServer(timeout = 15000) { const backendUrl = getRuntimeBackendUrl(); const healthUrl = `${backendUrl}/api/system/health`; const start = Date.now(); let lastError; while (Date.now() - start <= timeout) { try { const health = await requestJson(healthUrl, 3000); if (health?.status === "ok") return health; lastError = new Error("Wathiqa server returned an invalid health response"); } catch (error) { lastError = error; } await new Promise((resolve) => setTimeout(resolve, 500)); } throw new Error(`Wathiqa server connection timeout: ${backendUrl} (${lastError?.message || "unknown error"})`); }
async function checkLicense() { return requestJson(`${getRuntimeBackendUrl()}/api/license/validate`, 10000); }
function createStartupErrorWindow(error) { const config = getRuntimeConfig(); const isClient = config.mode === "client"; const serverAddress = config.serverUrl || getRuntimeBackendUrl(); const title = isClient ? "Wathiqa server unavailable" : "Wathiqa could not start"; const message = isClient ? `This computer is configured as a Wathiqa client, but the office server could not be reached.<br><br><strong>Server:</strong> ${serverAddress}<br><strong>Error:</strong> ${error.message}` : `The Wathiqa application server did not become available.<br><br><strong>Error:</strong> ${error.message}`; const win = new BrowserWindow({ width: 800, height: 500, autoHideMenuBar: true, icon: APP_ICON, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } }); win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(`<!doctype html><html lang="en"><body style="font-family:sans-serif;padding:40px"><h2>${title}</h2><p>${message}</p><p>Please verify the Wathiqa server is running and both computers are connected to the same office network.</p></body></html>`)); }

app.whenReady().then(async () => { try { deploymentConfig = loadConfig(); loadLocalBackendIfRequired(); configureSession(); await waitForServer(); let license; try { license = await checkLicense(); } catch (error) { if (deploymentConfig.mode === "client") throw new Error(`Unable to validate the office license through the server: ${error.message}`); license = { valid: false }; } createWindow(license?.valid ? LOGIN_PAGE : ACTIVATION_PAGE); if (deploymentConfig.mode === "client") startHeartbeat(); } catch (error) { console.error(error); createStartupErrorWindow(error); } });
app.on("window-all-closed", () => { if (heartbeatTimer) clearInterval(heartbeatTimer); try { if (server) server.close(); } catch (err) { console.error(err); } if (process.platform !== "darwin") app.quit(); });
