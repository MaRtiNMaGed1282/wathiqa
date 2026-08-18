const fs = require("fs");
const os = require("os");
const path = require("path");

const VALID_MODES = new Set(["standalone", "server", "client"]);
const DEFAULT_PORT = 5000;
const DEFAULT_HOSTS = Object.freeze({
  standalone: "127.0.0.1",
  server: "0.0.0.0",
});
const CONFIG_DIR_NAME = "Wathiqa";
const CONFIG_FILE_NAME = "deployment.json";

function getConfigDirectory() {
  try {
    const { app } = require("electron");
    if (app && typeof app.getPath === "function") return app.getPath("userData");
  } catch (_) {}
  return path.join(os.homedir(), CONFIG_DIR_NAME);
}

function getConfigPath() {
  return path.join(getConfigDirectory(), CONFIG_FILE_NAME);
}

function normalizeServerUrl(value) {
  if (!value) return null;
  let url;
  try { url = new URL(String(value).trim()); }
  catch { throw new Error("serverUrl must be a valid HTTP or HTTPS URL"); }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("serverUrl must use HTTP or HTTPS");
  }
  url.hash = "";
  url.search = "";
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString().replace(/\/$/, "");
}

function normalizeConfig(input = {}) {
  const mode = String(input.mode || "standalone").trim().toLowerCase();
  if (!VALID_MODES.has(mode)) throw new Error(`Invalid Wathiqa deployment mode: ${mode}`);

  const port = input.port === undefined || input.port === null || input.port === ""
    ? DEFAULT_PORT
    : Number(input.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("port must be a valid TCP port");
  }

  const serverUrl = normalizeServerUrl(input.serverUrl);
  if (mode === "client" && !serverUrl) throw new Error("client mode requires serverUrl");

  const host = mode === "client"
    ? null
    : String(input.host || DEFAULT_HOSTS[mode]).trim();

  if (mode !== "client" && !host) throw new Error("server host is required");

  return {
    mode,
    host,
    serverUrl,
    serverIdentity: input.serverIdentity ? String(input.serverIdentity).trim() : null,
    port,
  };
}

function getDefaultConfig() {
  return {
    mode: "standalone",
    host: DEFAULT_HOSTS.standalone,
    serverUrl: null,
    serverIdentity: null,
    port: DEFAULT_PORT,
  };
}

function loadConfig() {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) return getDefaultConfig();
  try {
    return normalizeConfig(JSON.parse(fs.readFileSync(configPath, "utf8")));
  } catch (error) {
    throw new Error(`Invalid Wathiqa deployment configuration: ${error.message}`);
  }
}

function saveConfig(input) {
  const config = normalizeConfig(input);
  const configPath = getConfigPath();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return config;
}

function getApiBaseUrl(config = loadConfig()) {
  return config.mode === "client" ? `${config.serverUrl}/api` : "/api";
}

function getBackendUrl(config = loadConfig()) {
  return config.mode === "client" ? config.serverUrl : `http://localhost:${config.port}`;
}

function getServerListenHost(config = loadConfig()) {
  if (config.mode === "server") return config.host || DEFAULT_HOSTS.server;
  return DEFAULT_HOSTS.standalone;
}

module.exports = {
  VALID_MODES: [...VALID_MODES],
  DEFAULT_PORT,
  DEFAULT_HOSTS,
  getConfigDirectory,
  getConfigPath,
  getDefaultConfig,
  loadConfig,
  saveConfig,
  normalizeConfig,
  getApiBaseUrl,
  getBackendUrl,
  getServerListenHost,
};
