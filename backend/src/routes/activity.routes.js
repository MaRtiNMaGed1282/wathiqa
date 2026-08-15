const express = require("express");

const router = express.Router();

const activityController = require("../controllers/activity.controller");
const clientTimelineController = require("../controllers/client-timeline.controller");

const auth = require("../middlewares/auth.middleware");

router.get("/", auth, activityController.getActivity);

router.get("/case/:id", auth, activityController.getCaseActivity);

router.get("/client/:id", auth, activityController.getClientActivity);
router.get("/client/:id/timeline", auth, clientTimelineController.getClientTimeline);

module.exports = router;
