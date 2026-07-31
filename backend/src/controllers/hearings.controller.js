const logActivity = require("../utils/activityLogger");
const { createNotification } = require("../utils/notificationService");
const db = require("../config/sqlite");

/**
 * Create Hearing
 */
exports.createHearing = (req, res) => {
  const {
    case_id,
    hearing_date,
    hearing_time,
    hearing_type,
    judge_name,
    courtroom,
    hearing_result,
    notes,
    next_hearing_date,
    postponement_reason,
  } = req.body;

  db.run(
    `
    INSERT INTO hearings (
      case_id,
      hearing_date,
      hearing_time,
      hearing_type,
      judge_name,
      courtroom,
      hearing_result,
      notes,
      next_hearing_date,
      postponement_reason
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      case_id,
      hearing_date,
      hearing_time,
      hearing_type,
      judge_name,
      courtroom,
      hearing_result,
      notes,
      next_hearing_date,
      postponement_reason,
    ],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: "Failed to create hearing",
          error: err.message,
        });
      }
      logActivity({
        module: "hearing",
        record_id: this.lastID,
        action: "created",
        description: "تم إضافة جلسة جديدة",
        user_id: req.user.id,
      });

      createNotification({
        title: "Hearing created",
        message: `A new hearing was scheduled for case ${case_id} on ${hearing_date}`,
        type: "info",
        module: "hearing",
        record_id: this.lastID,
        user_id: req.user.id,
      }).catch((err) => {
        console.error("Notification error:", err.message);
      });

      res.status(201).json({
        message: "Hearing created successfully",
        hearing_id: this.lastID,
      });
    },
  );
};
/**
 * Get Hearings By Case
 */
exports.getHearingsByCase = (req, res) => {
  const { caseId } = req.params;

  db.all(
    `
    SELECT *
    FROM hearings
    WHERE case_id = ?
    ORDER BY hearing_date DESC
    `,
    [caseId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          message: "Failed to fetch hearings",
          error: err.message,
        });
      }

      res.json(rows);
    },
  );
};

exports.getHearingById = (req, res) => {
  const { id } = req.params;

  db.get(
    `
    SELECT
      hearing_id,
      case_id,
      hearing_date,
      hearing_time,
      hearing_type,
      judge_name,
      courtroom,
      hearing_result,
      notes,
      next_hearing_date,
      postponement_reason,
      created_at
    FROM hearings
    WHERE hearing_id = ?
    `,
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      if (!row) {
        return res.status(404).json({
          message: "Hearing not found",
        });
      }

      res.json(row);
    },
  );
};

exports.updateHearing = (req, res) => {
  const { id } = req.params;

  const {
    hearing_date,
    hearing_time,
    hearing_type,
    judge_name,
    courtroom,
    hearing_result,
    notes,
    next_hearing_date,
    postponement_reason,
  } = req.body;

  db.run(
    `
    UPDATE hearings
    SET
      hearing_date = ?,
      hearing_time = ?,
      hearing_type = ?,
      judge_name = ?,
      courtroom = ?,
      hearing_result = ?,
      notes = ?,
      next_hearing_date = ?,
      postponement_reason = ?
    WHERE hearing_id = ?
    `,
    [
      hearing_date,
      hearing_time,
      hearing_type,
      judge_name,
      courtroom,
      hearing_result,
      notes,
      next_hearing_date,
      postponement_reason,
      id,
    ],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          message: "Hearing not found",
        });
      }
      logActivity({
        module: "hearing",
        record_id: Number(id),
        action: "updated",
        description: "تم تعديل بيانات الجلسة",
        user_id: req.user.id,
      });
      db.get(
        `
        SELECT *
        FROM hearings
        WHERE hearing_id = ?
        `,
        [id],
        (err, hearing) => {
          if (err) {
            return res.status(500).json({
              message: err.message,
            });
          }

          if (
            hearing.hearing_result === "تم التأجيل" &&
            hearing.next_hearing_date
          ) {
            db.get(
              `
              SELECT *
              FROM hearings
              WHERE case_id = ?
              AND hearing_date = ?
              `,
              [hearing.case_id, hearing.next_hearing_date],
              (err, existing) => {
                if (err) {
                  return res.status(500).json({
                    message: err.message,
                  });
                }

                if (existing) {
                  return res.json({
                    message: "تم تحديث الجلسة والجلسة القادمة موجودة بالفعل",
                  });
                }

                db.run(
                  `
                  INSERT INTO hearings (
                    case_id,
                    hearing_date,
                    hearing_type,
                    judge_name,
                    courtroom
                  )
                  VALUES (?, ?, ?, ?, ?)
                  `,
                  [
                    hearing.case_id,
                    hearing.next_hearing_date,
                    hearing.hearing_type,
                    hearing.judge_name,
                    hearing.courtroom,
                  ],
                  function (err) {
                    if (err) {
                      return res.status(500).json({
                        message: err.message,
                      });
                    }

                    logActivity({
                      module: "hearing",
                      record_id: this.lastID,
                      action: "created",
                      description: "تم إنشاء الجلسة القادمة تلقائياً",
                      user_id: req.user.id,
                    });

                    res.json({
                      message: "تم تحديث الجلسة وإنشاء الجلسة القادمة تلقائياً",
                    });
                  },
                );
              },
            );
          } else {
            res.json({
              message: "تم تحديث الجلسة بنجاح",
            });
          }
        },
      );
    },
  );
};
exports.deleteHearing = (req, res) => {
  const { id } = req.params;

  db.run(
    `
    DELETE FROM hearings
    WHERE hearing_id = ?
    `,
    [id],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          message: "Hearing not found",
        });
      }

      logActivity({
        module: "hearing",
        record_id: Number(id),
        action: "deleted",
        description: "تم حذف الجلسة",
        user_id: req.user.id,
      });

      res.json({
        message: "Hearing deleted",
      });
    },
  );
};

exports.getAllHearings = (req, res) => {
  db.all(
    `
    SELECT
      hearings.hearing_id,
      hearings.case_id,
      hearings.hearing_date,
      hearings.hearing_time,
      hearings.hearing_type,
      hearings.judge_name,
      hearings.courtroom,
      hearings.hearing_result,
      hearings.notes,
      hearings.next_hearing_date,
      hearings.postponement_reason,
      hearings.created_at,
      legal_cases.case_title,
      legal_cases.court_case_number
    FROM hearings
    LEFT JOIN legal_cases
      ON hearings.case_id = legal_cases.case_id
    ORDER BY hearings.hearing_date ASC
    `,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      res.json(rows);
    },
  );
};

exports.getUpcomingHearings = (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  db.all(
    `
    SELECT
      h.*,
      lc.case_title
    FROM hearings h
    LEFT JOIN legal_cases lc
      ON h.case_id = lc.case_id
    WHERE h.hearing_date >= ?
    ORDER BY h.hearing_date ASC
    LIMIT 10
    `,
    [today],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      res.json(rows);
    },
  );
};
