const auth = require("../middlewares/auth.middleware");

const admin = require("../middlewares/admin.middleware");

const express = require("express");

const router = express.Router();

const officeController = require("../controllers/office.controller");

const upload = require("../middlewares/upload.js");

router.get("/", auth, officeController.getOfficeSettings);

router.post("/", auth, admin, officeController.saveOfficeSettings);

router.post(
  "/upload",
  auth,
  admin,
  upload.fields([
    {
      name: "logo",
      maxCount: 1,
    },
    {
      name: "stamp",
      maxCount: 1,
    },
  ]),
  officeController.uploadOfficeAssets,
);

module.exports = router;
