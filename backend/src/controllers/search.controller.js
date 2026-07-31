const db = require("../config/sqlite");

function isSearchQueryValid(query) {
  return typeof query === "string" && query.trim().length >= 2;
}

function escapeLikeValue(value) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function buildLikePattern(query) {
  const trimmed = query.trim();
  const escaped = escapeLikeValue(trimmed);
  return `%${escaped}%`;
}

function runSearchQuery(sql, params) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });
}

function searchClients(query) {
  const sql = `
      SELECT id,
             full_name,
             national_id,
             phone
      FROM clients
      WHERE full_name LIKE ? ESCAPE '\\'
         OR national_id LIKE ? ESCAPE '\\'
         OR phone LIKE ? ESCAPE '\\'
      LIMIT 10
    `;

  const pattern = buildLikePattern(query);
  return runSearchQuery(sql, [pattern, pattern, pattern]);
}

function searchCases(query) {
  const sql = `
      SELECT case_id AS id,
             case_number,
             case_title AS title,
             case_type
      FROM legal_cases
      WHERE case_number LIKE ? ESCAPE '\\'
         OR case_title LIKE ? ESCAPE '\\'
         OR case_type LIKE ? ESCAPE '\\'
      LIMIT 10
    `;

  const pattern = buildLikePattern(query);
  return runSearchQuery(sql, [pattern, pattern, pattern]);
}

function searchServices(query) {
  const sql = `
      SELECT service_id AS id,
             service_title AS service_name,
             description
      FROM legal_services
      WHERE service_title LIKE ? ESCAPE '\\'
         OR description LIKE ? ESCAPE '\\'
      LIMIT 10
    `;

  const pattern = buildLikePattern(query);
  return runSearchQuery(sql, [pattern, pattern]);
}

function searchHearings(query) {
  const sql = `
      SELECT hearing_id AS id,
             session_number,
             courtroom AS court_name,
             hearing_date
      FROM hearings
      WHERE session_number LIKE ? ESCAPE '\\'
         OR courtroom LIKE ? ESCAPE '\\'
      LIMIT 10
    `;

  const pattern = buildLikePattern(query);
  return runSearchQuery(sql, [pattern, pattern]);
}

function searchPayments(query) {
  const sql = `
      SELECT payment_id AS id,
             payment_reference,
             amount,
             notes
      FROM payments
      WHERE payment_reference LIKE ? ESCAPE '\\'
         OR notes LIKE ? ESCAPE '\\'
      LIMIT 10
    `;

  const pattern = buildLikePattern(query);
  return runSearchQuery(sql, [pattern, pattern]);
}

function searchFiles(query) {
  const sql = `
      SELECT file_id AS id,
             original_name
      FROM case_files
      WHERE original_name LIKE ? ESCAPE '\\'
      LIMIT 10
    `;

  const pattern = buildLikePattern(query);
  return runSearchQuery(sql, [pattern]);
}

function searchTemplates(query) {
  const sql = `
      SELECT id,
             title
      FROM legal_templates
      WHERE title LIKE ? ESCAPE '\\'
      LIMIT 10
    `;

  const pattern = buildLikePattern(query);
  return runSearchQuery(sql, [pattern]);
}

exports.globalSearch = async (req, res) => {
  const query = req.query.q;

  if (!isSearchQueryValid(query)) {
    return res.status(400).json({
      message: "Search query is required and must be at least 2 characters",
    });
  }

  try {
    const [clients, cases, services, hearings, payments, files, templates] =
      await Promise.all([
        searchClients(query),
        searchCases(query),
        searchServices(query),
        searchHearings(query),
        searchPayments(query),
        searchFiles(query),
        searchTemplates(query),
      ]);

    res.json({
      clients,
      cases,
      services,
      hearings,
      payments,
      files,
      templates,
    });
  } catch (error) {
    console.error("Global search failed:", error.message || error);
    res.status(500).json({
      message: "Failed to execute search",
    });
  }
};
