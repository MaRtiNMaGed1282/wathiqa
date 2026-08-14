const upload = require("../config/upload");
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

const {
  uploadFile,
  getFilesByCase,
  deleteFile,
  uploadServiceFile,
  getFilesByService,
  downloadServiceFile,
  deleteServiceFile,
} = require("../controllers/files.controller");

// Case files
router.post("/upload", auth, upload.single("file"), uploadFile);
router.get("/case/:caseId", auth, getFilesByCase);
router.delete("/:id", auth, role("admin", "lawyer"), deleteFile);

// Service files
router.post("/service/upload", auth, upload.single("file"), uploadServiceFile);
router.get("/service/:serviceId", auth, getFilesByService);
router.get("/service/:id/download", auth, downloadServiceFile);
router.delete("/service/:id", auth, role("admin", "lawyer"), deleteServiceFile);

module.exports = router;
