const express = require("express");
const router = express.Router();
const activityController = require("../controllers/activity.controller");
const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");

const allRoles = authorize("admin", "lawyer", "assistant");

router.get("/", auth, allRoles, activityController.getActivity);
router.get("/case/:id", auth, allRoles, activityController.getCaseActivity);
router.get("/client/:id", auth, allRoles, activityController.getClientActivity);
router.get("/service/:id", auth, allRoles, activityController.getServiceActivity);

module.exports = router;
