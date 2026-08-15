const { app, BrowserWindow, session } = require("electron");
const path = require("path");
const http = require("http");

const BACKEND_URL = "http://localhost:5000";
const LOGIN_PAGE = path.join(__dirname, "../frontend/pages/login.html");
const ACTIVATION_PAGE = path.join(__dirname, "../frontend/pages/activation.html");
const APP_ICON = path.join(__dirname, "../assets/wathiqa.ico");

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});

const server = require("../backend/src/server");

function configureSession() {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...(details.responseHeaders || {}) };
    responseHeaders["Content-Security-Policy"] = [
      "default-src 'self' file:; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' file: data: blob:; " +
      "font-src 'self' file: data:; " +
      "connect-src 'self' http://localhost:5000; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "frame-src 'none';",
    ];
    callback({ responseHeaders });
  });
}

function configureNavigation(win) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    // Invoice printing uses window.open("", "_blank") and writes the printable
    // document into that window. Keep external navigation blocked while allowing
    // this controlled about:blank child window.
    if (!url || url === "about:blank") return { action: "allow" };
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file://")) {
      event.preventDefault();
    }
  });
}

function createWindow(page) {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: true,
    icon: APP_ICON,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  win.maximize();
  configureNavigation(win);

  win.loadFile(page);

  win.webContents.on("did-fail-load", (_event, code, desc) => {
    console.error("LOAD FAILED:", code, desc);
  });

  return win;
}

function checkLicense() {
  return new Promise((resolve) => {
    http
      .get(`${BACKEND_URL}/api/license/validate`, (res) => {
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
      const request = http.get(BACKEND_URL, () => {
        resolve();
      });

      request.on("error", () => {
        if (Date.now() - start > timeout) {
          reject(new Error("Backend startup timeout"));
        } else {
          setTimeout(check, 500);
        }
      });
    };

    check();
  });
}

app.whenReady().then(async () => {
  configureSession();

  try {
    await waitForServer();

    const license = await checkLicense();
    createWindow(license.valid ? LOGIN_PAGE : ACTIVATION_PAGE);
  } catch (err) {
    console.error(err);

    const win = new BrowserWindow({
      width: 800,
      height: 500,
      autoHideMenuBar: true,
      icon: APP_ICON,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    win.loadURL(
      "data:text/html;charset=utf-8," +
        encodeURIComponent(
          "<!doctype html><html lang=\"en\"><body style=\"font-family:sans-serif;padding:40px\"><h2>Wathiqa could not start</h2><p>The local application server did not become available.</p></body></html>",
        ),
    );
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
