const db = require("../config/sqlite");

function logActivity({ module, record_id, action, description, user_id }) {
  db.run(
    `
    INSERT INTO activity_logs
    (
      module,
      record_id,
      action,
      description,
      user_id
    )
    VALUES (?, ?, ?, ?, ?)
    `,
    [module, record_id, action, description, user_id],
    (err) => {
      if (err) {
        console.error("خطأ في سجل النشاط:", err.message);
      }
    },
  );
}

module.exports = logActivity;
