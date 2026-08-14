const path = require("path");

const allowedExtensions = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".jpg",
  ".jpeg",
  ".png",
];

const allowedMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
];

const maxFileSize = 5 * 1024 * 1024;

function sanitizeFilename(filename) {
  return (filename || "").replace(/[^a-zA-Z0-9._-]/g, "-");
}

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || "").toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    return cb(new Error("Unsupported file type"));
  }

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error("Unsupported file type"));
  }

  cb(null, true);
}

function createFileValidationOptions() {
  return {
    limits: {
      fileSize: maxFileSize,
    },
    fileFilter,
  };
}

module.exports = {
  allowedExtensions,
  allowedMimeTypes,
  maxFileSize,
  sanitizeFilename,
  fileFilter,
  createFileValidationOptions,
};
