const upload = require("../config/upload");
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

const {
  uploadFile,
  getFilesByCase,
  deleteFile,
} = require("../controllers/files.controller");

router.post("/upload", auth, upload.single("file"), uploadFile);

router.get("/case/:caseId", auth, getFilesByCase);

router.delete("/:id", auth, role("admin", "lawyer"), deleteFile);

module.exports = router;
