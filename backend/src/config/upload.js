const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  sanitizeFilename,
  createFileValidationOptions,
} = require("../utils/fileValidation");

function getUploadDir() {
  try {
    const { app } = require("electron");

    return app && app.isPackaged
      ? path.join(app.getPath("userData"), "uploads")
      : path.join(__dirname, "../../../uploads");
  } catch {
    return path.join(__dirname, "../../../uploads");
  }
}

const uploadDir = getUploadDir();

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const originalName = Buffer.from(file.originalname, "latin1").toString(
      "utf8",
    );

    cb(null, Date.now() + "-" + sanitizeFilename(originalName));
  },
});

const upload = multer({
  storage,
  ...createFileValidationOptions(),
});

upload.getUploadDir = getUploadDir;

module.exports = upload;
