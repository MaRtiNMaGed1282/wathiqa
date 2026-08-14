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

router.post("/upload", auth, upload.single("file"), uploadFile);
router.get("/case/:caseId", auth, getFilesByCase);
router.delete("/:id", auth, authorize("admin", "lawyer"), deleteFile);

module.exports = router;
