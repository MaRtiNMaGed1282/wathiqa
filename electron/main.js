const { app, BrowserWindow } = require("electron");
const path = require("path");
const http = require("http");

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});

const server = require("../backend/src/server");

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "../assets/wathiqa.ico"),
  });

  win.maximize();

  win.loadFile(path.join(__dirname, "../frontend/pages/login.html"));

  win.webContents.on("did-fail-load", (e, code, desc) => {
    console.log("LOAD FAILED:", code, desc);
  });
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
function waitForServer(timeout = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = () => {
      http
        .get("http://localhost:5000", () => {
          resolve();
        })
        .on("error", () => {
          if (Date.now() - start > timeout) {
            reject(new Error("Backend startup timeout"));
          } else {
            setTimeout(check, 1000);
          }
        });
    };

    check();
  });
}

app.whenReady().then(async () => {
  try {
    await waitForServer();

    const license = await checkLicense();

    if (license.valid) {
      createWindow();
    } else {
      const win = new BrowserWindow({
        width: 1400,
        height: 900,
        autoHideMenuBar: true,
        icon: path.join(__dirname, "../frontend/assets/faviconw.png"),
      });

      win.maximize();

      win.loadFile(path.join(__dirname, "../frontend/pages/activation.html"));
    }
  } catch (err) {
    console.error(err);

    const win = new BrowserWindow({
      width: 800,
      height: 500,
      autoHideMenuBar: true,
    });

    win.loadURL("data:text/html,<h2>Failed to start backend server</h2>");
  }
});

app.on("window-all-closed", () => {
  try {
    server.close();
  } catch (err) {
    console.error(err);
  }

  app.quit();
});
