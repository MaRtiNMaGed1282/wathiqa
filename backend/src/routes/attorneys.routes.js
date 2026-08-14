const express = require("express");
const path = require("path");
const fs = require("fs");
const db = require("../config/sqlite");
const attorneyUpload = require("../config/attorneyUpload");

const router = express.Router();

const upload = require("../config/attorneyUpload");
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

const {
  createAttorney,
  getClientAttorneys,
  downloadAttorneyFile,
  deleteAttorney,
} = require("../controllers/attorneys.controller");

router.post("/", auth, upload.single("file"), createAttorney);

router.get("/client/:clientId", auth, getClientAttorneys);

router.get("/:id/file", auth, downloadAttorneyFile);

router.get("/file-by-name/:filename", auth, (req, res) => {
  const filename = path.basename(req.params.filename);

  db.get(
    `SELECT file_path FROM client_attorneys WHERE file_path = ? OR file_path LIKE ? LIMIT 1`,
    [filename, `%/${filename}`],
    (err, attorney) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!attorney || !attorney.file_path) {
        return res.status(404).json({ message: "ملف التوكيل غير موجود" });
      }

      const absolutePath = path.join(attorneyUpload.getUploadDir(), path.basename(attorney.file_path));
      if (!fs.existsSync(absolutePath)) {
        return res.status(404).json({ message: "ملف التخزين غير موجود" });
      }

      return res.sendFile(absolutePath);
    },
  );
});

router.delete("/:id", auth, role("admin", "lawyer"), deleteAttorney);

module.exports = router;
