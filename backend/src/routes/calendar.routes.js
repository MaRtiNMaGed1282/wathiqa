const express = require("express");
const auth = require("../middlewares/auth.middleware");
const router = express.Router();
const { getAllCalendarItems } = require("../controllers/calendar.controller");

router.get("/", auth, getAllCalendarItems);

module.exports = router;
