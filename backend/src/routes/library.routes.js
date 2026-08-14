const express = require("express");
const router = express.Router();

const { getAllLaws, getLawById } = require("../controllers/library.controller");
const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");

const readOnly = authorize("admin", "lawyer", "assistant");

router.get("/laws", auth, readOnly, getAllLaws);
router.get("/laws/:id", auth, readOnly, getLawById);

module.exports = router;
