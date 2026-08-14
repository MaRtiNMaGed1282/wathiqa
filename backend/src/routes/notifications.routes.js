const express = require("express");
const router = express.Router();
const notificationsController = require("../controllers/notifications.controller");
const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");

const allRoles = authorize("admin", "lawyer", "assistant");

router.get("/", auth, allRoles, notificationsController.getNotifications);
router.get("/unread-count", auth, allRoles, notificationsController.getUnreadCount);
router.put("/:id/read", auth, allRoles, notificationsController.markNotificationRead);
router.put("/read-all", auth, allRoles, notificationsController.markAllNotificationsRead);
router.delete("/:id", auth, allRoles, notificationsController.deleteNotification);

module.exports = router;
