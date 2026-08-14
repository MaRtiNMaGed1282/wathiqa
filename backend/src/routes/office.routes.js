const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");
const express = require("express");
const router = express.Router();
const officeController = require("../controllers/office.controller");
const upload = require("../middlewares/upload.js");

router.get("/", auth, authorize("admin", "lawyer", "assistant"), officeController.getOfficeSettings);
router.post("/", auth, authorize("admin"), officeController.saveOfficeSettings);
router.post(
  "/upload",
  auth,
  authorize("admin"),
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "stamp", maxCount: 1 },
  ]),
  officeController.uploadOfficeAssets,
);

module.exports = router;
