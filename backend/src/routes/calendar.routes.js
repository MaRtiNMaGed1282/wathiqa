const express = require("express");
const auth = require("../middlewares/auth.middleware");
const router = express.Router();
const {
  createSession,
  getAllSessions,
} = require("../controllers/calendar.controller");

router.post("/", auth, createSession);
router.get("/", auth, getAllSessions);

module.exports = router;
