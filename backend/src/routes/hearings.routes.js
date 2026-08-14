const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");
const {
  createHearing,
  getHearingsByCase,
  getHearingById,
  updateHearing,
  deleteHearing,
  getAllHearings,
  getUpcomingHearings,
  getCalendarEvents,
} = require("../controllers/hearings.controller");

const allRoles = authorize("admin", "lawyer", "assistant");

router.post("/", auth, allRoles, createHearing);
router.get("/case/:caseId", auth, allRoles, getHearingsByCase);
router.get("/calendar", auth, allRoles, getCalendarEvents);
router.get("/", auth, allRoles, getAllHearings);
router.get("/upcoming", auth, allRoles, getUpcomingHearings);
router.get("/:id", auth, allRoles, getHearingById);
router.put("/:id", auth, allRoles, updateHearing);
router.delete("/:id", auth, authorize("admin", "lawyer"), deleteHearing);

module.exports = router;
