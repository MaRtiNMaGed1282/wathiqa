const multer = require("multer");
const path = require("path");
const fs = require("fs");

function getUploadDir() {
  try {
    const { app } = require("electron");

    return
      app && app.isPackaged
        ? path.join(app.getPath("userData"), "attorneys")
        : path.join(__dirname, "../../../database/attorneys");
  } catch {
    return path.join(__dirname, "../../../database/attorneys");
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

    cb(null, Date.now() + "-" + originalName);
  },
});

module.exports = multer({
  storage,
});

module.exports.getUploadDir = getUploadDir;
