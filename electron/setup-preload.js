const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("wathiqaSetup", {
  getState: () => ipcRenderer.invoke("setup:get-state"),
  saveStandalone: (payload) => ipcRenderer.invoke("setup:save-standalone", payload),
  saveServer: (payload) => ipcRenderer.invoke("setup:save-server", payload),
  generatePairing: () => ipcRenderer.invoke("setup:generate-pairing"),
  discoverServers: () => ipcRenderer.invoke("setup:discover-servers"),
  testServer: (payload) => ipcRenderer.invoke("setup:test-server", payload),
  saveClient: (payload) => ipcRenderer.invoke("setup:save-client", payload),
  launchWathiqa: () => ipcRenderer.invoke("setup:launch-wathiqa"),
});
