'use strict';

const db = require('../config/sqlite');

exports.getAllDocuments = (req, res) => {
  const search = String(req.query.search || '').trim();
  const type = String(req.query.type || 'all').trim();
  const like = `%${search}%`;

  const sources = [];
  const params = [];

  if (type === 'all' || type === 'case') {
    sources.push(`
      SELECT
        'case' AS document_type,
        cf.file_id AS id,
        cf.file_name,
        cf.original_name,
        cf.file_path,
        cf.uploaded_at,
        cf.case_id,
        NULL AS service_id,
        lc.case_title AS related_title,
        lc.court_case_number AS related_number,
        c.full_name AS client_name
      FROM case_files cf
      LEFT JOIN legal_cases lc ON cf.case_id = lc.case_id
      LEFT JOIN clients c ON lc.client_id = c.id
      WHERE (? = '' OR cf.original_name LIKE ? OR lc.case_title LIKE ? OR lc.court_case_number LIKE ? OR c.full_name LIKE ?)
    `);
    params.push(search, like, like, like, like);
  }

  if (type === 'all' || type === 'service') {
    sources.push(`
      SELECT
        'service' AS document_type,
        sf.file_id AS id,
        sf.file_name,
        sf.original_name,
        sf.file_path,
        sf.uploaded_at,
        NULL AS case_id,
        sf.service_id,
        ls.service_title AS related_title,
        ls.service_type AS related_number,
        c.full_name AS client_name
      FROM service_files sf
      LEFT JOIN legal_services ls ON sf.service_id = ls.service_id
      LEFT JOIN clients c ON ls.client_id = c.id
      WHERE (? = '' OR sf.original_name LIKE ? OR ls.service_title LIKE ? OR ls.service_type LIKE ? OR c.full_name LIKE ?)
    `);
    params.push(search, like, like, like, like);
  }

  const sql = `${sources.join(' UNION ALL ')} ORDER BY datetime(uploaded_at) DESC, id DESC`;

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'تعذر تحميل المستندات', error: err.message });
    }

    return res.json(rows || []);
  });
};
