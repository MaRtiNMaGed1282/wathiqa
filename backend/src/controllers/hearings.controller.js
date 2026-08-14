const logActivity = require("../utils/activityLogger");
const { createNotification } = require("../utils/notificationService");
const db = require("../config/sqlite");

function validId(value) {
  return /^\d+$/.test(String(value || "")) && Number(value) > 0;
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function validateHearingPayload(body) {
  if (!validId(body.case_id)) return "Invalid case_id";
  if (!validDate(body.hearing_date)) return "Invalid hearing_date";
  if (body.next_hearing_date && !validDate(body.next_hearing_date)) return "Invalid next_hearing_date";
  return null;
}

function verifyCase(caseId, callback) {
  db.get("SELECT case_id, case_title, court_case_number FROM legal_cases WHERE case_id = ?", [caseId], (err, row) => {
    if (err) return callback(err);
    if (!row) return callback(null, null);
    callback(null, row);
  });
}

exports.createHearing = (req, res) => {
  const payload = req.body || {};
  const validationError = validateHearingPayload(payload);
  if (validationError) return res.status(400).json({ message: validationError });

  verifyCase(payload.case_id, (caseErr, caseRow) => {
    if (caseErr) return res.status(500).json({ message: caseErr.message });
    if (!caseRow) return res.status(404).json({ message: "Case not found" });

    db.run(
      `INSERT INTO hearings (case_id, hearing_date, hearing_time, hearing_type, judge_name, courtroom, hearing_result, notes, next_hearing_date, postponement_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [payload.case_id, payload.hearing_date, payload.hearing_time || null, payload.hearing_type || null, payload.judge_name || null, payload.courtroom || null, payload.hearing_result || null, payload.notes || null, payload.next_hearing_date || null, payload.postponement_reason || null],
      function (err) {
        if (err) return res.status(500).json({ message: "Failed to create hearing", error: err.message });

        const hearingId = this.lastID;
        logActivity({ module: "hearing", record_id: hearingId, action: "created", description: "تم إضافة جلسة جديدة", user_id: req.user.id });
        createNotification({ title: "Hearing created", message: `A new hearing was scheduled for case ${payload.case_id} on ${payload.hearing_date}`, type: "info", module: "hearing", record_id: hearingId, user_id: req.user.id }).catch((err) => console.error("Notification error:", err.message));
        res.status(201).json({ message: "Hearing created successfully", hearing_id: hearingId });
      },
    );
  });
};

exports.getHearingsByCase = (req, res) => {
  const { caseId } = req.params;
  if (!validId(caseId)) return res.status(400).json({ message: "Invalid case id" });
  db.all("SELECT * FROM hearings WHERE case_id = ? ORDER BY hearing_date DESC, hearing_time DESC, hearing_id DESC", [caseId], (err, rows) => {
    if (err) return res.status(500).json({ message: "Failed to fetch hearings", error: err.message });
    res.json(rows);
  });
};

exports.getHearingById = (req, res) => {
  const { id } = req.params;
  if (!validId(id)) return res.status(400).json({ message: "Invalid hearing id" });
  db.get(`SELECT hearing_id, case_id, hearing_date, hearing_time, hearing_type, judge_name, courtroom, hearing_result, notes, next_hearing_date, postponement_reason, created_at FROM hearings WHERE hearing_id = ?`, [id], (err, row) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!row) return res.status(404).json({ message: "Hearing not found" });
    res.json(row);
  });
};

exports.updateHearing = (req, res) => {
  const { id } = req.params;
  if (!validId(id)) return res.status(400).json({ message: "Invalid hearing id" });
  const payload = req.body || {};

  if (!validDate(payload.hearing_date)) return res.status(400).json({ message: "Invalid hearing_date" });
  if (payload.next_hearing_date && !validDate(payload.next_hearing_date)) return res.status(400).json({ message: "Invalid next_hearing_date" });

  db.get("SELECT case_id FROM hearings WHERE hearing_id = ?", [id], (findErr, existing) => {
    if (findErr) return res.status(500).json({ message: findErr.message });
    if (!existing) return res.status(404).json({ message: "Hearing not found" });

    db.run(
      `UPDATE hearings SET hearing_date = ?, hearing_time = ?, hearing_type = ?, judge_name = ?, courtroom = ?, hearing_result = ?, notes = ?, next_hearing_date = ?, postponement_reason = ? WHERE hearing_id = ?`,
      [payload.hearing_date, payload.hearing_time || null, payload.hearing_type || null, payload.judge_name || null, payload.courtroom || null, payload.hearing_result || null, payload.notes || null, payload.next_hearing_date || null, payload.postponement_reason || null, id],
      function (err) {
        if (err) return res.status(500).json({ message: err.message });
        if (this.changes === 0) return res.status(404).json({ message: "Hearing not found" });

        logActivity({ module: "hearing", record_id: Number(id), action: "updated", description: "تم تعديل بيانات الجلسة", user_id: req.user.id });

        if (payload.hearing_result === "تم التأجيل" && payload.next_hearing_date) {
          db.get("SELECT hearing_id FROM hearings WHERE case_id = ? AND hearing_date = ? AND hearing_id != ?", [existing.case_id, payload.next_hearing_date, id], (checkErr, duplicate) => {
            if (checkErr) return res.status(500).json({ message: checkErr.message });
            if (duplicate) return res.json({ message: "تم تحديث الجلسة والجلسة القادمة موجودة بالفعل" });

            db.run(`INSERT INTO hearings (case_id, hearing_date, hearing_type, judge_name, courtroom) VALUES (?, ?, ?, ?, ?)`, [existing.case_id, payload.next_hearing_date, payload.hearing_type || null, payload.judge_name || null, payload.courtroom || null], function (insertErr) {
              if (insertErr) return res.status(500).json({ message: insertErr.message });
              logActivity({ module: "hearing", record_id: this.lastID, action: "created", description: "تم إنشاء الجلسة القادمة تلقائياً", user_id: req.user.id });
              res.json({ message: "تم تحديث الجلسة وإنشاء الجلسة القادمة تلقائياً" });
            });
          });
        } else {
          res.json({ message: "تم تحديث الجلسة بنجاح" });
        }
      },
    );
  });
};

exports.deleteHearing = (req, res) => {
  const { id } = req.params;
  if (!validId(id)) return res.status(400).json({ message: "Invalid hearing id" });
  db.run("DELETE FROM hearings WHERE hearing_id = ?", [id], function (err) {
    if (err) return res.status(500).json({ message: err.message });
    if (this.changes === 0) return res.status(404).json({ message: "Hearing not found" });
    logActivity({ module: "hearing", record_id: Number(id), action: "deleted", description: "تم حذف الجلسة", user_id: req.user.id });
    res.json({ message: "Hearing deleted" });
  });
};

exports.getAllHearings = (req, res) => {
  db.all(`
    SELECT hearings.hearing_id, hearings.case_id, hearings.hearing_date, hearings.hearing_time, hearings.hearing_type, hearings.judge_name, hearings.courtroom, hearings.hearing_result, hearings.notes, hearings.next_hearing_date, hearings.postponement_reason, hearings.created_at, legal_cases.case_title, legal_cases.court_case_number
    FROM hearings LEFT JOIN legal_cases ON hearings.case_id = legal_cases.case_id
    ORDER BY hearings.hearing_date ASC, hearings.hearing_time ASC, hearings.hearing_id ASC
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows);
  });
};

exports.getCalendarEvents = (req, res) => {
  const fromDate = req.query.fromDate && validDate(req.query.fromDate) ? req.query.fromDate : null;
  const toDate = req.query.toDate && validDate(req.query.toDate) ? req.query.toDate : null;
  if (req.query.fromDate && !fromDate) return res.status(400).json({ message: "Invalid fromDate" });
  if (req.query.toDate && !toDate) return res.status(400).json({ message: "Invalid toDate" });
  if (fromDate && toDate && fromDate > toDate) return res.status(400).json({ message: "fromDate cannot be later than toDate" });

  const params = [];
  let hearingWhere = "1 = 1";
  let serviceWhere = "legal_services.service_status != 'ملغاة'";
  if (fromDate) { hearingWhere += " AND hearings.hearing_date >= ?"; serviceWhere += " AND legal_services.due_date >= ?"; params.push(fromDate); }
  if (toDate) { hearingWhere += " AND hearings.hearing_date <= ?"; serviceWhere += " AND legal_services.due_date <= ?"; params.push(toDate); }

  const hearingParams = [];
  const serviceParams = [];
  if (fromDate) hearingParams.push(fromDate);
  if (toDate) hearingParams.push(toDate);
  if (fromDate) serviceParams.push(fromDate);
  if (toDate) serviceParams.push(toDate);

  const query = `
    SELECT * FROM (
      SELECT
        'hearing' AS event_type,
        hearings.hearing_id AS event_id,
        hearings.hearing_date AS event_date,
        hearings.hearing_time AS event_time,
        COALESCE(hearings.hearing_type, 'جلسة') AS event_subtype,
        legal_cases.case_id AS case_id,
        legal_cases.case_title AS title,
        legal_cases.court_case_number AS reference_number,
        hearings.judge_name AS person_name,
        hearings.courtroom AS location,
        hearings.hearing_result AS result,
        NULL AS service_id
      FROM hearings
      LEFT JOIN legal_cases ON hearings.case_id = legal_cases.case_id
      WHERE ${hearingWhere}

      UNION ALL

      SELECT
        'service_deadline' AS event_type,
        legal_services.service_id AS event_id,
        legal_services.due_date AS event_date,
        NULL AS event_time,
        'موعد تسليم خدمة' AS event_subtype,
        NULL AS case_id,
        legal_services.service_title AS title,
        legal_services.service_number AS reference_number,
        legal_services.assigned_to AS person_name,
        NULL AS location,
        legal_services.service_status AS result,
        legal_services.service_id AS service_id
      FROM legal_services
      WHERE ${serviceWhere}
    )
    ORDER BY event_date ASC, COALESCE(event_time, '23:59:59') ASC, event_id ASC
  `;

  db.all(query, [...hearingParams, ...serviceParams], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows);
  });
};

exports.getUpcomingHearings = (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  db.all(`SELECT h.*, lc.case_title FROM hearings h LEFT JOIN legal_cases lc ON h.case_id = lc.case_id WHERE h.hearing_date >= ? ORDER BY h.hearing_date ASC, h.hearing_time ASC LIMIT 10`, [today], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows);
  });
};
