const { contextBridge } = require("electron");

const DEFAULT_CONFIG = {
  mode: "standalone",
  serverUrl: null,
  serverIdentity: null,
  port: 5000,
};

function loadRuntimeConfig() {
  const argument = process.argv.find((value) => value.startsWith("--wathiqa-config="));
  if (!argument) return DEFAULT_CONFIG;

  try {
    return {
      ...DEFAULT_CONFIG,
      ...JSON.parse(decodeURIComponent(argument.slice("--wathiqa-config=".length))),
    };
  } catch (error) {
    console.error("Failed to parse Wathiqa runtime configuration:", error);
    return DEFAULT_CONFIG;
  }
}

const deploymentConfig = loadRuntimeConfig();
const BASE_URL = deploymentConfig.mode === "client" && deploymentConfig.serverUrl
  ? `${deploymentConfig.serverUrl.replace(/\/$/, "")}/api`
  : "/api";

contextBridge.exposeInMainWorld("__APP_CONFIG__", {
  BASE_URL,
  DEPLOYMENT_MODE: deploymentConfig.mode,
  SERVER_URL: deploymentConfig.serverUrl,
  SERVER_IDENTITY: deploymentConfig.serverIdentity,
  PORT: deploymentConfig.port,
});
