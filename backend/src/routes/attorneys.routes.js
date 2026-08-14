const express = require("express");
const router = express.Router();

const upload = require("../config/attorneyUpload");
const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");

const {
  createAttorney,
  getClientAttorneys,
  deleteAttorney,
} = require("../controllers/attorneys.controller");

router.post("/", auth, upload.single("file"), createAttorney);
router.get("/client/:clientId", auth, getClientAttorneys);
router.delete("/:id", auth, authorize("admin", "lawyer"), deleteAttorney);

module.exports = router;
