const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const upload = require("../config/upload");
const {
  uploadServiceFiles,
  getServiceFiles,
  openServiceFile,
  downloadServiceFile,
  deleteServiceFile,
} = require("../controllers/service-files.controller");

router.post("/upload", auth, upload.array("files", 20), uploadServiceFiles);
router.get("/service/:serviceId", auth, getServiceFiles);
router.get("/:id/open", auth, openServiceFile);
router.get("/:id/download", auth, downloadServiceFile);
router.delete("/:id", auth, deleteServiceFile);

module.exports = router;
