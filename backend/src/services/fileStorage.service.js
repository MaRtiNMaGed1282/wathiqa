const fs = require("fs");
const os = require("os");
const path = require("path");

const STORAGE_DIR_NAME = "Wathiqa";
const UPLOADS_DIR_NAME = "uploads";

function getDataDirectory() {
  try {
    const { app } = require("electron");
    if (app && typeof app.getPath === "function") {
      return app.getPath("userData");
    }
  } catch (_) {}

  if (process.env.WATHIQA_DATA_DIR) {
    return path.resolve(process.env.WATHIQA_DATA_DIR);
  }

  return path.join(os.homedir(), STORAGE_DIR_NAME);
}

function getUploadDirectory() {
  return path.join(getDataDirectory(), UPLOADS_DIR_NAME);
}

function ensureUploadDirectory() {
  const directory = getUploadDirectory();
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

function resolveStoredFile(filename) {
  const safeFilename = path.basename(String(filename || ""));
  if (!safeFilename || safeFilename === "." || safeFilename === "..") return null;

  const directory = path.resolve(ensureUploadDirectory());
  const absolutePath = path.resolve(directory, safeFilename);
  if (absolutePath === directory || !absolutePath.startsWith(`${directory}${path.sep}`)) return null;
  return absolutePath;
}

function fileExists(filename) {
  const absolutePath = resolveStoredFile(filename);
  return Boolean(absolutePath && fs.existsSync(absolutePath));
}

function removeFile(filename) {
  const absolutePath = resolveStoredFile(filename);
  if (!absolutePath || !fs.existsSync(absolutePath)) return false;
  fs.unlinkSync(absolutePath);
  return true;
}

module.exports = {
  getDataDirectory,
  getUploadDirectory,
  ensureUploadDirectory,
  resolveStoredFile,
  fileExists,
  removeFile,
};
