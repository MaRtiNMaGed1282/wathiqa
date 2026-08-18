const { contextBridge } = require("electron");
const { loadConfig, getApiBaseUrl } = require("./deployment-config");

let deploymentConfig;

try {
  deploymentConfig = loadConfig();
} catch (error) {
  console.error("Failed to load Wathiqa deployment configuration:", error);
  deploymentConfig = {
    mode: "standalone",
    serverUrl: null,
    serverIdentity: null,
    port: 5000,
  };
}

contextBridge.exposeInMainWorld("__APP_CONFIG__", {
  BASE_URL: getApiBaseUrl(deploymentConfig),
  DEPLOYMENT_MODE: deploymentConfig.mode,
  SERVER_URL: deploymentConfig.serverUrl,
  SERVER_IDENTITY: deploymentConfig.serverIdentity,
  PORT: deploymentConfig.port,
});
