const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const {
  getAllLaws,
  getLawById,
  getLawFile,
} = require("../controllers/library.controller");

router.use(auth);

// Legal Library is read-only for all authenticated roles.
router.get("/laws", getAllLaws);
router.get("/laws/:id", getLawById);
router.get("/laws/:id/file", getLawFile);

module.exports = router;
