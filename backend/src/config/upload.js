const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  sanitizeFilename,
  createFileValidationOptions,
} = require("../utils/fileValidation");
let uploadDir;

try {
  const { app } = require("electron");

  uploadDir =
    app && app.isPackaged
      ? path.join(app.getPath("userData"), "uploads")
      : path.join(__dirname, "../../../uploads");
} catch {
  uploadDir = path.join(__dirname, "../../../uploads");
}

console.log("UPLOAD DIR =", uploadDir);

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

module.exports = multer({
  storage,
  ...createFileValidationOptions(),
});
