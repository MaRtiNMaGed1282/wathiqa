const { app, BrowserWindow } = require("electron");
const path = require("path");
const http = require("http");

require("../backend/src/server");

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "../frontend/assets/faviconw.png"),
  });

  win.maximize();

  win.loadURL("http://localhost:5000/pages/login.html");
}

function checkLicense() {
  return new Promise((resolve) => {
    http
      .get("http://localhost:5000/api/license/validate", (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve({ valid: false });
          }
        });
      })
      .on("error", () => {
        resolve({ valid: false });
      });
  });
}

app.whenReady().then(async () => {
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const license = await checkLicense();

  if (license.valid) {
    createWindow();
  } else {
    const win = new BrowserWindow({
      width: 700,
      height: 600,
      autoHideMenuBar: true,
    });

    win.loadFile(path.join(__dirname, "../frontend/pages/activation.html"));
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
