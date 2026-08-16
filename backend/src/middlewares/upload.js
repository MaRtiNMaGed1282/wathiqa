const multer = require("multer");
const path = require("path");
const {
  sanitizeFilename,
  createFileValidationOptions,
} = require("../utils/fileValidation");
const { getUploadsRoot, ensureDirectory } = require("../utils/storagePaths");

// Use the same persistent storage location as the rest of the Electron application.
// In packaged mode this resolves to Electron's userData directory rather than the
// read-only application bundle.
const uploadsRoot = getUploadsRoot();
ensureDirectory(uploadsRoot);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsRoot);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + sanitizeFilename(file.originalname));
  },
});

console.log("MULTER UPLOADS =", uploadsRoot);

const upload = multer({ storage, ...createFileValidationOptions() });

module.exports = upload;
