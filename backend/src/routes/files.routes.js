const upload = require("../config/upload");
const express = require("express");
const path = require("path");
const fs = require("fs");
const db = require("../config/sqlite");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const { getAllDocuments } = require("../controllers/documents.controller");

const {
  uploadFile,
  getFilesByCase,
  downloadCaseFile,
  deleteFile,
  uploadServiceFile,
  getFilesByService,
  downloadServiceFile,
  deleteServiceFile,
} = require("../controllers/files.controller");

function sendStoredUpload(res, filename) {
  const safeFilename = path.basename(filename);
  const absolutePath = path.resolve(__dirname, "../../uploads", safeFilename);

  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({ message: "ملف التخزين غير موجود" });
  }

  return res.sendFile(absolutePath);
}

// Unified document management read model
router.get("/", auth, getAllDocuments);

// Case files
router.post("/upload", auth, upload.single("file"), uploadFile);
router.get("/case/:caseId", auth, getFilesByCase);
router.get("/case/:caseId/:id/download", auth, downloadCaseFile);
router.get("/by-name/:filename", auth, (req, res) => {
  const filename = path.basename(req.params.filename);

  db.get(
    `SELECT file_path FROM case_files WHERE file_name = ?`,
    [filename],
    (err, file) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!file) return res.status(404).json({ message: "الملف غير موجود" });
      return sendStoredUpload(res, path.basename(file.file_path));
    },
  );
});
router.delete("/:id", auth, role("admin", "lawyer"), deleteFile);

// Service files
router.post("/service/upload", auth, upload.single("file"), uploadServiceFile);
router.get("/service/:serviceId", auth, getFilesByService);
router.get("/service/:id/download", auth, downloadServiceFile);
router.delete("/service/:id", auth, role("admin", "lawyer"), deleteServiceFile);

module.exports = router;
