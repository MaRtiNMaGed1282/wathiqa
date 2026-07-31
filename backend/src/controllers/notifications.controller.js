const db = require("../config/sqlite");

function isPositiveInteger(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

function isNonNegativeInteger(value) {
  return /^\d+$/.test(String(value)) && Number(value) >= 0;
}

exports.getNotifications = (req, res) => {
  const { limit = "20", offset = "0", unread, read } = req.query;

  if (unread && unread !== "true") {
    return res.status(400).json({
      message: "Invalid unread filter",
    });
  }

  if (read && read !== "true") {
    return res.status(400).json({
      message: "Invalid read filter",
    });
  }

  if (unread === "true" && read === "true") {
    return res.status(400).json({
      message: "Cannot filter by both read and unread",
    });
  }

  if (!isPositiveInteger(limit)) {
    return res.status(400).json({
      message: "Invalid limit",
    });
  }

  if (!isNonNegativeInteger(offset)) {
    return res.status(400).json({
      message: "Invalid offset",
    });
  }

  const conditions = ["user_id = ?"];
  const params = [req.user.id];

  if (unread === "true") {
    conditions.push("is_read = 0");
  } else if (read === "true") {
    conditions.push("is_read = 1");
  }

  const query = `
    SELECT *
    FROM notifications
    WHERE ${conditions.join(" AND ")}
    ORDER BY created_at DESC,
             id DESC
    LIMIT ?
    OFFSET ?
  `;

  db.all(query, [...params, Number(limit), Number(offset)], (err, rows) => {
    if (err) {
      return res.status(500).json({
        message: err.message,
      });
    }

    res.json(rows);
  });
};

exports.getUnreadCount = (req, res) => {
  db.get(
    `
    SELECT COUNT(*) AS count
    FROM notifications
    WHERE user_id = ?
      AND is_read = 0
  `,
    [req.user.id],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      res.json({ count: row.count });
    },
  );
};

exports.markNotificationRead = (req, res) => {
  const { id } = req.params;

  if (!isPositiveInteger(id)) {
    return res.status(400).json({
      message: "Invalid notification id",
    });
  }

  db.run(
    `
    UPDATE notifications
    SET is_read = 1
    WHERE id = ?
      AND user_id = ?
  `,
    [Number(id), req.user.id],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          message: "Notification not found",
        });
      }

      res.json({ message: "Notification marked as read" });
    },
  );
};

exports.markAllNotificationsRead = (req, res) => {
  db.run(
    `
    UPDATE notifications
    SET is_read = 1
    WHERE user_id = ?
      AND is_read = 0
  `,
    [req.user.id],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      res.json({ updated: this.changes });
    },
  );
};

exports.deleteNotification = (req, res) => {
  const { id } = req.params;

  if (!isPositiveInteger(id)) {
    return res.status(400).json({
      message: "Invalid notification id",
    });
  }

  db.run(
    `
    DELETE FROM notifications
    WHERE id = ?
      AND user_id = ?
  `,
    [Number(id), req.user.id],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          message: "Notification not found",
        });
      }

      res.status(204).send();
    },
  );
};
