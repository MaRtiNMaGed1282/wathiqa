const db = require("../config/sqlite");

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

exports.getDeadlines = async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const requestedTo = validDate(req.query.to) ? req.query.to : null;

    const serviceParams = [today, requestedTo || "9999-12-31"];
    const hearingParams = [today, requestedTo || "9999-12-31"];

    const [services, hearings] = await Promise.all([
      dbAll(`
        SELECT
          ls.service_id AS record_id,
          ls.service_title AS title,
          ls.due_date,
          ls.priority_level AS priority,
          ls.service_status,
          ls.client_id,
          c.full_name AS client_name,
          'service' AS module
        FROM legal_services ls
        LEFT JOIN clients c ON c.id = ls.client_id
        WHERE ls.due_date IS NOT NULL
          AND date(ls.due_date) >= date(?)
          AND date(ls.due_date) <= date(?)
          AND lower(COALESCE(ls.service_status, '')) NOT IN ('completed', 'مكتملة', 'مكتمل')
        ORDER BY date(ls.due_date) ASC, ls.service_id ASC
        LIMIT 100
      `, serviceParams),
      dbAll(`
        SELECT
          h.hearing_id AS record_id,
          h.case_id,
          h.hearing_date AS due_date,
          h.hearing_time,
          h.hearing_type,
          lc.case_title AS title,
          lc.court_case_number,
          c.full_name AS client_name,
          'hearing' AS module
        FROM hearings h
        LEFT JOIN legal_cases lc ON lc.case_id = h.case_id
        LEFT JOIN clients c ON c.id = lc.client_id
        WHERE h.hearing_date IS NOT NULL
          AND date(h.hearing_date) >= date(?)
          AND date(h.hearing_date) <= date(?)
        ORDER BY date(h.hearing_date) ASC, h.hearing_time ASC, h.hearing_id ASC
        LIMIT 100
      `, hearingParams),
    ]);

    const deadlines = [...services, ...hearings]
      .map((item) => {
        const date = item.due_date;
        const diff = Math.round((new Date(`${date}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000);
        return {
          ...item,
          daysRemaining: diff,
          urgency: diff === 0 ? "today" : diff <= 3 ? "urgent" : diff <= 7 ? "soon" : "upcoming",
        };
      })
      .sort((a, b) => a.due_date.localeCompare(b.due_date) || String(a.module).localeCompare(String(b.module)))
      .slice(0, 100);

    res.json({
      today,
      deadlines,
      counts: {
        total: deadlines.length,
        today: deadlines.filter((item) => item.daysRemaining === 0).length,
        next7Days: deadlines.filter((item) => item.daysRemaining >= 0 && item.daysRemaining <= 7).length,
      },
    });
  } catch (error) {
    next(error);
  }
};
