const db = require("../config/sqlite");
const { isArchived } = require("../services/archive.service");

function isSearchQueryValid(query) {
  return typeof query === "string" && query.trim().length >= 2;
}

function escapeLikeValue(value) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function buildLikePattern(query) {
  return `%${escapeLikeValue(query.trim())}%`;
}

function runSearchQuery(sql, params) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

async function removeArchived(rows, type, idKey = "id") {
  const result = [];
  for (const row of rows || []) {
    const id = row?.[idKey] ?? row?.id;
    if (id == null || !(await isArchived(type, Number(id)))) result.push(row);
  }
  return result;
}

function searchClients(query) {
  const pattern = buildLikePattern(query);
  return runSearchQuery(
    `SELECT id, full_name, client_code, national_id, phone, address
     FROM clients
     WHERE full_name LIKE ? ESCAPE '\\'
        OR client_code LIKE ? ESCAPE '\\'
        OR national_id LIKE ? ESCAPE '\\'
        OR phone LIKE ? ESCAPE '\\'
        OR address LIKE ? ESCAPE '\\'
     ORDER BY created_at DESC
     LIMIT 10`,
    [pattern, pattern, pattern, pattern, pattern],
  );
}

function searchCases(query) {
  const pattern = buildLikePattern(query);
  return runSearchQuery(
    `SELECT case_id AS id,
            court_case_number AS case_number,
            case_title AS title,
            case_type,
            court_name,
            court_chamber
     FROM legal_cases
     WHERE court_case_number LIKE ? ESCAPE '\\'
        OR case_title LIKE ? ESCAPE '\\'
        OR case_type LIKE ? ESCAPE '\\'
        OR court_name LIKE ? ESCAPE '\\'
        OR court_chamber LIKE ? ESCAPE '\\'
     ORDER BY created_at DESC
     LIMIT 10`,
    [pattern, pattern, pattern, pattern, pattern],
  );
}

function searchServices(query) {
  const pattern = buildLikePattern(query);
  return runSearchQuery(
    `SELECT service_id AS id, service_title AS service_name, description
     FROM legal_services
     WHERE service_title LIKE ? ESCAPE '\\'
        OR description LIKE ? ESCAPE '\\'
     ORDER BY created_at DESC
     LIMIT 10`,
    [pattern, pattern],
  );
}

function searchHearings(query) {
  const pattern = buildLikePattern(query);
  return runSearchQuery(
    `SELECT h.hearing_id AS id,
            h.hearing_type,
            h.courtroom AS court_name,
            h.judge_name,
            h.hearing_date,
            lc.court_case_number AS case_number,
            lc.case_title
     FROM hearings h
     LEFT JOIN legal_cases lc ON lc.case_id = h.case_id
     WHERE h.hearing_type LIKE ? ESCAPE '\\'
        OR h.courtroom LIKE ? ESCAPE '\\'
        OR h.judge_name LIKE ? ESCAPE '\\'
        OR lc.court_case_number LIKE ? ESCAPE '\\'
        OR lc.case_title LIKE ? ESCAPE '\\'
     ORDER BY h.hearing_date DESC
     LIMIT 10`,
    [pattern, pattern, pattern, pattern, pattern],
  );
}

function searchPayments(query) {
  const pattern = buildLikePattern(query);
  return runSearchQuery(
    `SELECT payment_id AS id, amount, payment_method, notes
     FROM payments
     WHERE payment_method LIKE ? ESCAPE '\\'
        OR notes LIKE ? ESCAPE '\\'
        OR CAST(amount AS TEXT) LIKE ?
     ORDER BY payment_date DESC
     LIMIT 10`,
    [pattern, pattern, pattern],
  );
}

function searchFiles(query) {
  const pattern = buildLikePattern(query);
  return runSearchQuery(
    `SELECT cf.file_id AS id,
            cf.original_name,
            cf.case_id,
            lc.court_case_number AS case_number
     FROM case_files cf
     LEFT JOIN legal_cases lc ON lc.case_id = cf.case_id
     WHERE cf.original_name LIKE ? ESCAPE '\\'
     ORDER BY cf.file_id DESC
     LIMIT 10`,
    [pattern],
  );
}

function searchLaws(query) {
  const pattern = buildLikePattern(query);
  return runSearchQuery(
    `SELECT id, title, category
     FROM laws
     WHERE title LIKE ? ESCAPE '\\'
        OR category LIKE ? ESCAPE '\\'
     ORDER BY title COLLATE NOCASE ASC
     LIMIT 10`,
    [pattern, pattern],
  );
}

exports.globalSearch = async (req, res) => {
  const query = req.query.q;

  if (!isSearchQueryValid(query)) {
    return res.status(400).json({
      message: "Search query is required and must be at least 2 characters",
    });
  }

  try {
    const includeFinancial = req.user?.role === "admin" || req.user?.role === "lawyer";

    const [clients, cases, services, hearings, files, laws] = await Promise.all([
      searchClients(query),
      searchCases(query),
      searchServices(query),
      searchHearings(query),
      searchFiles(query),
      searchLaws(query),
    ]);

    const payments = includeFinancial ? await searchPayments(query) : [];

    const [visibleClients, visibleCases, visibleServices] = await Promise.all([
      removeArchived(clients, "client"),
      removeArchived(cases, "case"),
      removeArchived(services, "service"),
    ]);

    res.json({
      clients: visibleClients,
      cases: visibleCases,
      services: visibleServices,
      hearings,
      payments,
      files,
      laws,
    });
  } catch (error) {
    console.error("Global search failed:", error.message || error);
    res.status(500).json({ message: "Failed to execute search" });
  }
};
