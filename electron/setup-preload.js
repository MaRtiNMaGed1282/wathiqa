const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("wathiqaSetup", {
  getState: () => ipcRenderer.invoke("setup:get-state"),
  saveStandalone: (payload) => ipcRenderer.invoke("setup:save-standalone", payload),
  saveServer: (payload) => ipcRenderer.invoke("setup:save-server", payload),
  testServer: (payload) => ipcRenderer.invoke("setup:test-server", payload),
  saveClient: (payload) => ipcRenderer.invoke("setup:save-client", payload),
  openUrl: (url) => ipcRenderer.invoke("setup:open-url", url),
});
