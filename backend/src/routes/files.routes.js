const express = require("express");

const router = express.Router();

const upload = require("../config/upload");

const {
  uploadFile,
  getFilesByCase,
  deleteFile,
} = require("../controllers/files.controller");

router.post("/upload", upload.single("file"), uploadFile);

router.get("/case/:caseId", getFilesByCase);

router.delete("/:id", deleteFile);

module.exports = router;
