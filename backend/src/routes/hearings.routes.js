const express = require("express");

const router = express.Router();

const {
  createHearing,
  getHearingsByCase,
  getHearingById,
  updateHearing,
  deleteHearing,
  getAllHearings,
  getUpcomingHearings,
} = require("../controllers/hearings.controller");

router.post("/", createHearing);

router.get("/case/:caseId", getHearingsByCase);

router.get("/", getAllHearings);

router.get("/upcoming", getUpcomingHearings);

router.get("/:id", getHearingById);

router.put("/:id", updateHearing);

router.delete("/:id", deleteHearing);

module.exports = router;
