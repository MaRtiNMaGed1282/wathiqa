const db = require("../config/sqlite");

/**
 * Unified calendar read model.
 *
 * Calendar events are derived from the canonical operational tables:
 * - hearings: court sessions
 * - legal_services.due_date: service deadlines
 *
 * The legacy court_sessions table is intentionally not used here.
 */
exports.getAllCalendarItems = (req, res) => {
  const sql = `
    SELECT *
    FROM (
      SELECT
        'hearing' AS event_type,
        h.hearing_id AS event_id,
        h.case_id,
        NULL AS service_id,
        h.hearing_date AS event_date,
        h.hearing_time AS event_time,
        h.hearing_type AS subtype,
        h.hearing_result AS result,
        h.judge_name,
        h.courtroom,
        lc.case_title,
        lc.court_case_number,
        lc.case_type,
        lc.court_name,
        c.full_name AS client_name,
        NULL AS service_title,
        NULL AS service_status,
        NULL AS priority_level
      FROM hearings h
      LEFT JOIN legal_cases lc ON h.case_id = lc.case_id
      LEFT JOIN clients c ON lc.client_id = c.id

      UNION ALL

      SELECT
        'service_deadline' AS event_type,
        ls.service_id AS event_id,
        NULL AS case_id,
        ls.service_id,
        ls.due_date AS event_date,
        NULL AS event_time,
        ls.service_type AS subtype,
        NULL AS result,
        NULL AS judge_name,
        NULL AS courtroom,
        NULL AS case_title,
        NULL AS court_case_number,
        NULL AS case_type,
        NULL AS court_name,
        c.full_name AS client_name,
        ls.service_title,
        ls.service_status,
        ls.priority_level
      FROM legal_services ls
      LEFT JOIN clients c ON ls.client_id = c.id
      WHERE ls.due_date IS NOT NULL
    ) AS calendar_items
    ORDER BY date(event_date) ASC, event_time ASC, event_id ASC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({
        message: "Failed to fetch calendar items",
        error: err.message,
      });
    }

    res.json(rows || []);
  });
};
