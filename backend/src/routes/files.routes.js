const express = require("express");

const router = express.Router();

const upload = require("../config/upload");
const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");

const {
  uploadFile,
  getFilesByCase,
  deleteFile,
} = require("../controllers/files.controller");

// Case files are operational data: all roles may view/upload.
// Destructive deletion is Admin-only under the frozen Case permission model.
router.post("/upload", auth, authorize("admin", "lawyer", "assistant"), upload.single("file"), uploadFile);
router.get("/case/:caseId", auth, authorize("admin", "lawyer", "assistant"), getFilesByCase);
router.delete("/:id", auth, authorize("admin"), deleteFile);

module.exports = router;
