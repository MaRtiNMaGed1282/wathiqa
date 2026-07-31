const multer = require("multer");
const path = require("path");
const fs = require("fs");
let uploadDir;

try {
  const { app } = require("electron");

  uploadDir =
    app && app.isPackaged
      ? path.join(app.getPath("userData"), "attorneys")
      : path.join(__dirname, "../../../database/attorneys");
} catch {
  uploadDir = path.join(__dirname, "../../../database/attorneys");
}

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
