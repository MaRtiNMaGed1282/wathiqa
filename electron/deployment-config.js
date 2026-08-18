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
  try {
    url = new URL(String(value).trim());
  } catch {
    throw new Error("serverUrl must be a valid HTTP or HTTPS URL");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("serverUrl must use HTTP or HTTPS");
  }

  url.hash = "";
  url.search = "";
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString().replace(/\/$/, "");
}

function normalizeHost(value, mode) {
  const fallback = DEFAULT_HOSTS[mode] || DEFAULT_HOSTS.standalone;
  if (!value) return fallback;

  const host = String(value).trim();
  if (!host || /[\s/\\]/.test(host)) {
    throw new Error("host must be a valid hostname or IP address");
  }
  return host;
}

function normalizeConfig(input = {}) {
  const mode = String(input.mode || "standalone").trim().toLowerCase();

  if (!VALID_MODES.has(mode)) {
    throw new Error(`Invalid Wathiqa deployment mode: ${mode}`);
  }

  const port = input.port === undefined || input.port === null || input.port === ""
    ? DEFAULT_PORT
    : Number(input.port);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("port must be a valid TCP port");
  }

  const serverUrl = normalizeServerUrl(input.serverUrl);

  if (mode === "client" && !serverUrl) {
    throw new Error("client mode requires serverUrl");
  }

  return {
    mode,
    serverUrl,
    serverIdentity: input.serverIdentity ? String(input.serverIdentity).trim() : null,
    host: normalizeHost(input.host, mode),
    port,
  };
}

function getDefaultConfig() {
  return {
    mode: "standalone",
    serverUrl: null,
    serverIdentity: null,
    host: DEFAULT_HOSTS.standalone,
    port: DEFAULT_PORT,
  };
}

function loadConfig() {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) return getDefaultConfig();

  try {
    const raw = fs.readFileSync(configPath, "utf8");
    return normalizeConfig(JSON.parse(raw));
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
  if (config.mode === "client") return `${config.serverUrl}/api`;
  return "/api";
}

function getBackendUrl(config = loadConfig()) {
  if (config.mode === "client") return config.serverUrl;
  return `http://localhost:${config.port}`;
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
};
