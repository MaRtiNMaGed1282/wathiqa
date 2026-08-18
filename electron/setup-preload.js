const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("wathiqaSetup", {
  getState: () => ipcRenderer.invoke("setup:get-state"),
  saveStandalone: (payload) => ipcRenderer.invoke("setup:save-standalone", payload),
  saveServer: (payload) => ipcRenderer.invoke("setup:save-server", payload),
  configureFirewall: (payload) => ipcRenderer.invoke("setup:configure-firewall", payload),
  inspectFirewall: (payload) => ipcRenderer.invoke("setup:inspect-firewall", payload),
  testLocalPort: (payload) => ipcRenderer.invoke("setup:test-local-port", payload),
  generatePairing: () => ipcRenderer.invoke("setup:generate-pairing"),
  discoverServers: () => ipcRenderer.invoke("setup:discover-servers"),
  testServer: (payload) => ipcRenderer.invoke("setup:test-server", payload),
  saveClient: (payload) => ipcRenderer.invoke("setup:save-client", payload),
  launchWathiqa: () => ipcRenderer.invoke("setup:launch-wathiqa"),
});
