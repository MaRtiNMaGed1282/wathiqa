const multer = require("multer");
const {
  ensureUploadDirectory,
  getUploadDirectory,
} = require("../services/fileStorage.service");
const {
  sanitizeFilename,
  createFileValidationOptions,
} = require("../utils/fileValidation");

const uploadDir = ensureUploadDirectory();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, ensureUploadDirectory());
  },

  filename: (req, file, cb) => {
    const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
    cb(null, Date.now() + "-" + sanitizeFilename(originalName));
  },
});

const upload = multer({
  storage,
  ...createFileValidationOptions(),
});

upload.getUploadDir = getUploadDirectory;

module.exports = upload;
