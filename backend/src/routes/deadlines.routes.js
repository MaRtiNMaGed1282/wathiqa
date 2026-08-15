const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const { getDeadlines } = require("../controllers/deadlines.controller");

router.get("/", auth, getDeadlines);

module.exports = router;
