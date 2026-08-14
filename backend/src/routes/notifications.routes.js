const express = require("express");

const router = express.Router();

const notificationsController = require("../controllers/notifications.controller");
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

router.get("/", auth, notificationsController.getNotifications);
router.get("/unread-count", auth, notificationsController.getUnreadCount);
router.put("/:id/read", auth, notificationsController.markNotificationRead);
router.put("/read-all", auth, notificationsController.markAllNotificationsRead);
router.delete("/:id", auth, role("admin", "lawyer"), notificationsController.deleteNotification);

module.exports = router;
