const express = require("express");

const router = express.Router();

const activityController = require("../controllers/activity.controller");
const clientTimelineController = require("../controllers/client-timeline.controller");

const auth = require("../middlewares/auth.middleware");

router.get("/", auth, activityController.getActivity);

router.get("/case/:id", auth, activityController.getCaseActivity);

// Client activity is now a unified timeline containing the client and its
// directly related cases, services, hearings, payments, expenses and files.
router.get("/client/:id", auth, clientTimelineController.getClientTimeline);
router.get("/client/:id/timeline", auth, clientTimelineController.getClientTimeline);

module.exports = router;
