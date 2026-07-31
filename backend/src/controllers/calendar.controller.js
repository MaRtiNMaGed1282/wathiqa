const db = require("../config/sqlite");

exports.createSession = (req, res) => {
  const { case_id, session_date, type, notes } = req.body;

  if (!case_id || !session_date || !type) {
    return res.status(400).json({
      message: "Case ID, session date, and type are required",
    });
  }

  db.run(
    `
    INSERT INTO court_sessions (
      case_id,
      session_date,
      type,
      notes
    )
    VALUES (?, ?, ?, ?)
    `,
    [case_id, session_date, type, notes || null],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: "Failed to create session",
          error: err.message,
        });
      }

      res.status(201).json({
        message: "Session created successfully",
        session_id: this.lastID,
      });
    },
  );
};

exports.getAllSessions = (req, res) => {
  db.all(
    `
    SELECT
      cs.*,
      lc.court_case_number,
      lc.case_type,
      c.full_name AS client_name

    FROM court_sessions cs

    LEFT JOIN legal_cases lc
      ON cs.case_id = lc.case_id

    LEFT JOIN clients c
      ON lc.client_id = c.id

    ORDER BY cs.session_date ASC
    `,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          message: "Failed to fetch sessions",
          error: err.message,
        });
      }

      res.json(rows);
    },
  );
};
