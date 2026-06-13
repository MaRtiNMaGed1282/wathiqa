const express = require("express");
const router = express.Router();
const { createSession, getAllSessions } = require("../controllers/calendar.controller");


router.post("/", createSession);       
router.get("/", getAllSessions);      

module.exports = router;
