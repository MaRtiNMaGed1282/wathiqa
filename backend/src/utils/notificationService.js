const db = require("../config/sqlite");

function createNotification({
  title,
  message,
  type,
  module,
  record_id,
  user_id,
}) {
  return new Promise((resolve) => {
    const sql = `
      INSERT INTO notifications
      (
        title,
        message,
        type,
        module,
        record_id,
        user_id
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(
      sql,
      [title, message, type, module, record_id, user_id],
      function (err) {
        if (err) {
          console.error("Notification Service Error:", err.message, {
            title,
            message,
            type,
            module,
            record_id,
            user_id,
          });
          return resolve(null);
        }

        resolve(this.lastID || null);
      },
    );
  });
}

module.exports = {
  createNotification,
};
