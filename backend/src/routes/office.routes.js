const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const admin = require("../middlewares/admin.middleware");
const officeController = require("../controllers/office.controller");
const upload = require("../middlewares/upload.js");

router.use(auth);

// All roles may view office information and office identity assets.
router.get("/", officeController.getOfficeSettings);
router.get("/asset/:type", officeController.getOfficeAsset);

// Only Admin may manage office information and identity assets.
router.post("/", admin, officeController.saveOfficeSettings);
router.post(
  "/upload",
  admin,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "stamp", maxCount: 1 },
  ]),
  officeController.uploadOfficeAssets,
);

module.exports = router;
