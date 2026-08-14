const fs = require("fs");
const path = require("path");

function getUserDataPath() {
  try {
    const { app } = require("electron");
    if (app && app.isPackaged) return app.getPath("userData");
  } catch {}

  return path.resolve(__dirname, "../../../");
}

function getUploadsRoot() {
  return path.join(getUserDataPath(), "uploads");
}

function getAttorneysRoot() {
  return path.join(getUserDataPath(), "attorneys");
}

function getLawsRoot() {
  try {
    const { app } = require("electron");
    if (app && app.isPackaged) {
      return path.join(process.resourcesPath, "database", "laws");
    }
  } catch {}

  return path.resolve(__dirname, "../../../database/laws");
}

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

module.exports = {
  getUserDataPath,
  getUploadsRoot,
  getAttorneysRoot,
  getLawsRoot,
  ensureDirectory,
};
