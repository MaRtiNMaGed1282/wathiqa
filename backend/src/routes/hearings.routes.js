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
} = require("../controllers/hearings.controller");

router.post("/", auth, createHearing);
router.get("/case/:caseId", auth, getHearingsByCase);
router.get("/", auth, getAllHearings);
router.get("/upcoming", auth, getUpcomingHearings);
router.get("/:id", auth, getHearingById);
router.put("/:id", auth, updateHearing);
router.delete("/:id", auth, authorize("admin", "lawyer"), deleteHearing);

module.exports = router;
