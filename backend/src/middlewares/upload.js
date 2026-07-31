const multer = require("multer");
const path = require("path");
const {
  sanitizeFilename,
  createFileValidationOptions,
} = require("../utils/fileValidation");

// مجلد تخزين الملفات
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../../../uploads")); // مجلد uploads في جذر المشروع
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + sanitizeFilename(file.originalname));
  },
});

console.log("MULTER UPLOADS =", path.join(__dirname, "../../../uploads"));

const upload = multer({ storage: storage, ...createFileValidationOptions() });

module.exports = upload;
