const db = require("../config/sqlite");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value) {
  if (!DATE_RE.test(value || "")) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveDateRange(filter = "all", startDate, endDate) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (filter === "all") return null;

  if (filter === "today") {
    const value = formatDate(today);
    return { startDate: value, endDate: value };
  }

  if (filter === "week") {
    const day = today.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    const start = new Date(today);
    start.setDate(start.getDate() - mondayOffset);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { startDate: formatDate(start), endDate: formatDate(end) };
  }

  if (filter === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { startDate: formatDate(start), endDate: formatDate(end) };
  }

  if (filter === "year") {
    const start = new Date(today.getFullYear(), 0, 1);
    const end = new Date(today.getFullYear(), 11, 31);
    return { startDate: formatDate(start), endDate: formatDate(end) };
  }

  if (filter === "custom") {
    const start = parseDate(startDate);
    const end = parseDate(endDate);

    if (!start || !end || start > end) {
      const error = new Error("فترة التاريخ غير صالحة");
      error.status = 400;
      throw error;
    }

    return { startDate, endDate };
  }

  const error = new Error("نوع الفترة غير صالح");
  error.status = 400;
  throw error;
}

function dateCondition(column, range, params) {
  if (!range) return "";
  params.push(range.startDate, range.endDate);
  return `AND date(${column}) BETWEEN ? AND ?`;
}

function runQuery(res, query, params, transform = (value) => value) {
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({
        message: "فشل تحميل البيانات المالية",
        error: err.message,
      });
    }

    res.json(transform(rows || []));
  });
}

exports.getSummary = (req, res) => {
  let range;
  try {
    range = resolveDateRange(req.query.filter || "all", req.query.startDate, req.query.endDate);
  } catch (error) {
    return res.status(error.status || 400).json({ message: error.message });
  }

  const params = [];
  const caseDate = dateCondition("created_at", range, params);
  const serviceDate = dateCondition("created_at", range, params);
  const paymentDate = dateCondition("payment_date", range, params);
  const caseExpenseDate = dateCondition("expense_date", range, params);
  const serviceExpenseDate = dateCondition("expense_date", range, params);

  const query = `
    SELECT
      (SELECT COUNT(*) FROM clients ${range ? `WHERE date(created_at) BETWEEN ? AND ?` : ""}) AS total_clients,
      (SELECT COUNT(*) FROM legal_cases ${range ? `WHERE date(created_at) BETWEEN ? AND ?` : ""}) AS total_cases,
      (SELECT COUNT(*) FROM legal_services ${range ? `WHERE date(created_at) BETWEEN ? AND ?` : ""}) AS total_services,
      (SELECT COALESCE(SUM(total_fees), 0) FROM legal_cases WHERE 1=1 ${caseDate}) AS case_fees,
      (SELECT COALESCE(SUM(total_fees), 0) FROM legal_services WHERE 1=1 ${serviceDate}) AS service_fees,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE 1=1 ${paymentDate}) AS total_paid,
      (SELECT COALESCE(SUM(amount), 0) FROM case_expenses WHERE 1=1 ${caseExpenseDate}) AS case_expenses,
      (SELECT COALESCE(SUM(amount), 0) FROM service_expenses WHERE 1=1 ${serviceExpenseDate}) AS service_expenses
  `;

  const countParams = [];
  if (range) {
    countParams.push(range.startDate, range.endDate, range.startDate, range.endDate, range.startDate, range.endDate);
  }

  db.get(query, [...countParams, ...params], (err, row) => {
    if (err) {
      return res.status(500).json({
        message: "فشل تحميل الملخص المالي",
        error: err.message,
      });
    }

    const data = row || {};
    data.total_clients = Number(data.total_clients || 0);
    data.total_cases = Number(data.total_cases || 0);
    data.total_services = Number(data.total_services || 0);
    data.case_fees = Number(data.case_fees || 0);
    data.service_fees = Number(data.service_fees || 0);
    data.total_fees = data.case_fees + data.service_fees;
    data.total_paid = Number(data.total_paid || 0);
    data.total_expenses = Number(data.case_expenses || 0) + Number(data.service_expenses || 0);
    data.remaining = data.total_fees - data.total_paid;
    data.net_profit = data.total_paid - data.total_expenses;
    data.collection_rate = data.total_fees > 0 ? Number(((data.total_paid / data.total_fees) * 100).toFixed(1)) : 0;
    data.period = range || { startDate: null, endDate: null };

    res.json(data);
  });
};

exports.getClientReceivables = (req, res) => {
  let range;
  try {
    range = resolveDateRange(req.query.filter || "all", req.query.startDate, req.query.endDate);
  } catch (error) {
    return res.status(error.status || 400).json({ message: error.message });
  }

  const search = String(req.query.search || "").trim();
  const params = [];
  const caseDate = dateCondition("lc.created_at", range, params);
  const serviceDate = dateCondition("ls.created_at", range, params);
  const paymentDate = dateCondition("p.payment_date", range, params);

  if (search) params.push(`%${search}%`);

  const query = `
    SELECT
      c.id,
      c.full_name,
      (
        SELECT COUNT(*)
        FROM legal_cases lc
        WHERE lc.client_id = c.id ${caseDate}
      ) + (
        SELECT COUNT(*)
        FROM legal_services ls
        WHERE ls.client_id = c.id ${serviceDate}
      ) AS total_items,
      (
        SELECT COALESCE(SUM(lc.total_fees), 0)
        FROM legal_cases lc
        WHERE lc.client_id = c.id ${caseDate}
      ) + (
        SELECT COALESCE(SUM(ls.total_fees), 0)
        FROM legal_services ls
        WHERE ls.client_id = c.id ${serviceDate}
      ) AS total_fees,
      (
        SELECT COALESCE(SUM(p.amount), 0)
        FROM payments p
        LEFT JOIN legal_cases pc ON pc.case_id = p.case_id
        LEFT JOIN legal_services ps ON ps.service_id = p.service_id
        WHERE (pc.client_id = c.id OR ps.client_id = c.id) ${paymentDate}
      ) AS total_paid
    FROM clients c
    ${search ? "WHERE c.full_name LIKE ?" : ""}
    ORDER BY total_fees DESC, c.full_name COLLATE NOCASE ASC
  `;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({
        message: "فشل تحميل المستحقات",
        error: err.message,
      });
    }

    const result = (rows || []).map((row) => {
      const totalFees = Number(row.total_fees || 0);
      const totalPaid = Number(row.total_paid || 0);
      return {
        id: row.id,
        full_name: row.full_name,
        total_items: Number(row.total_items || 0),
        total_fees: totalFees,
        total_paid: totalPaid,
        remaining: totalFees - totalPaid,
        status: totalFees - totalPaid > 0 ? "مدين" : "مسدد",
      };
    });

    res.json(result);
  });
};

exports.getRecentPayments = (req, res) => {
  let range;
  try {
    range = resolveDateRange(req.query.filter || "all", req.query.startDate, req.query.endDate);
  } catch (error) {
    return res.status(error.status || 400).json({ message: error.message });
  }

  const params = [];
  const paymentDate = dateCondition("p.payment_date", range, params);

  const query = `
    SELECT
      p.payment_id,
      p.amount,
      p.payment_date,
      p.payment_method,
      c.full_name,
      lc.case_title,
      ls.service_title
    FROM payments p
    LEFT JOIN legal_cases lc ON lc.case_id = p.case_id
    LEFT JOIN legal_services ls ON ls.service_id = p.service_id
    LEFT JOIN clients c ON c.id = COALESCE(lc.client_id, ls.client_id)
    WHERE 1=1 ${paymentDate}
    ORDER BY date(p.payment_date) DESC, p.payment_id DESC
    LIMIT 10
  `;

  runQuery(res, query, params);
};

exports.getTopDebtors = (req, res) => {
  let range;
  try {
    range = resolveDateRange(req.query.filter || "all", req.query.startDate, req.query.endDate);
  } catch (error) {
    return res.status(error.status || 400).json({ message: error.message });
  }

  const params = [];
  const caseDate = dateCondition("lc.created_at", range, params);
  const serviceDate = dateCondition("ls.created_at", range, params);
  const paymentDate = dateCondition("p.payment_date", range, params);

  const query = `
    SELECT
      c.id,
      c.full_name,
      (
        SELECT COALESCE(SUM(lc.total_fees), 0)
        FROM legal_cases lc
        WHERE lc.client_id = c.id ${caseDate}
      ) + (
        SELECT COALESCE(SUM(ls.total_fees), 0)
        FROM legal_services ls
        WHERE ls.client_id = c.id ${serviceDate}
      ) - (
        SELECT COALESCE(SUM(p.amount), 0)
        FROM payments p
        LEFT JOIN legal_cases pc ON pc.case_id = p.case_id
        LEFT JOIN legal_services ps ON ps.service_id = p.service_id
        WHERE (pc.client_id = c.id OR ps.client_id = c.id) ${paymentDate}
      ) AS remaining
    FROM clients c
    ORDER BY remaining DESC, c.full_name COLLATE NOCASE ASC
    LIMIT 5
  `;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({
        message: "فشل تحميل أعلى المدينين",
        error: err.message,
      });
    }

    res.json((rows || []).filter((row) => Number(row.remaining || 0) > 0).map((row) => ({
      ...row,
      remaining: Number(row.remaining || 0),
    })));
  });
};
