const multer = require("multer");
const path = require("path");
const {
  sanitizeFilename,
  createFileValidationOptions,
} = require("../utils/fileValidation");

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, "../../../database/templates"));
  },

  filename(req, file, cb) {
    const uniqueName = `${Date.now()}-${sanitizeFilename(file.originalname)}`;

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  ...createFileValidationOptions(),
});

module.exports = upload;
