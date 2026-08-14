const db = require("../config/sqlite");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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
    return {
      startDate: formatDate(new Date(today.getFullYear(), today.getMonth(), 1)),
      endDate: formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
    };
  }

  if (filter === "year") {
    return {
      startDate: formatDate(new Date(today.getFullYear(), 0, 1)),
      endDate: formatDate(new Date(today.getFullYear(), 11, 31)),
    };
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

function condition(column, range) {
  return range ? `AND date(${column}) BETWEEN ? AND ?` : "";
}

function addRangeParams(params, range) {
  if (range) params.push(range.startDate, range.endDate);
}

function runQuery(res, query, params) {
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "فشل تحميل البيانات المالية", error: err.message });
    }
    res.json(rows || []);
  });
}

function resolveRequestRange(req, res) {
  try {
    return resolveDateRange(req.query.filter || "all", req.query.startDate, req.query.endDate);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message });
    return undefined;
  }
}

exports.getSummary = (req, res) => {
  const range = resolveRequestRange(req, res);
  if (range === undefined && req.query.filter && req.query.filter !== "all") return;

  const params = [];
  const clientDate = condition("created_at", range);
  const caseDate = condition("created_at", range);
  const serviceDate = condition("created_at", range);
  const paymentDate = condition("payment_date", range);
  const caseExpenseDate = condition("expense_date", range);
  const serviceExpenseDate = condition("expense_date", range);

  const query = `
    SELECT
      (SELECT COUNT(*) FROM clients WHERE 1=1 ${clientDate}) AS total_clients,
      (SELECT COUNT(*) FROM legal_cases WHERE 1=1 ${caseDate}) AS total_cases,
      (SELECT COUNT(*) FROM legal_services WHERE 1=1 ${serviceDate}) AS total_services,
      (SELECT COALESCE(SUM(total_fees), 0) FROM legal_cases WHERE 1=1 ${caseDate}) AS case_fees,
      (SELECT COALESCE(SUM(total_fees), 0) FROM legal_services WHERE 1=1 ${serviceDate}) AS service_fees,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE 1=1 ${paymentDate}) AS total_paid,
      (SELECT COALESCE(SUM(amount), 0) FROM case_expenses WHERE 1=1 ${caseExpenseDate}) AS case_expenses,
      (SELECT COALESCE(SUM(amount), 0) FROM service_expenses WHERE 1=1 ${serviceExpenseDate}) AS service_expenses
  `;

  // Parameter order must exactly match the subquery order above.
  addRangeParams(params, range); // clients
  addRangeParams(params, range); // cases count
  addRangeParams(params, range); // services count
  addRangeParams(params, range); // case fees
  addRangeParams(params, range); // service fees
  addRangeParams(params, range); // payments
  addRangeParams(params, range); // case expenses
  addRangeParams(params, range); // service expenses

  db.get(query, params, (err, row) => {
    if (err) {
      return res.status(500).json({ message: "فشل تحميل الملخص المالي", error: err.message });
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
  const range = resolveRequestRange(req, res);
  if (range === undefined && req.query.filter && req.query.filter !== "all") return;

  const search = String(req.query.search || "").trim();
  const params = [];
  const caseDateCount = condition("lc.created_at", range);
  const serviceDateCount = condition("ls.created_at", range);
  const caseDateFees = condition("lc.created_at", range);
  const serviceDateFees = condition("ls.created_at", range);
  const paymentDate = condition("p.payment_date", range);

  const query = `
    SELECT
      c.id,
      c.full_name,
      (
        SELECT COUNT(*) FROM legal_cases lc
        WHERE lc.client_id = c.id ${caseDateCount}
      ) + (
        SELECT COUNT(*) FROM legal_services ls
        WHERE ls.client_id = c.id ${serviceDateCount}
      ) AS total_items,
      (
        SELECT COALESCE(SUM(lc.total_fees), 0) FROM legal_cases lc
        WHERE lc.client_id = c.id ${caseDateFees}
      ) + (
        SELECT COALESCE(SUM(ls.total_fees), 0) FROM legal_services ls
        WHERE ls.client_id = c.id ${serviceDateFees}
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

  // The same date range occurs five times in the query, so its parameters are repeated five times.
  addRangeParams(params, range); // case count
  addRangeParams(params, range); // service count
  addRangeParams(params, range); // case fees
  addRangeParams(params, range); // service fees
  addRangeParams(params, range); // payments
  if (search) params.push(`%${search}%`);

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "فشل تحميل المستحقات", error: err.message });
    }

    res.json((rows || []).map((row) => {
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
    }));
  });
};

exports.getRecentPayments = (req, res) => {
  const range = resolveRequestRange(req, res);
  if (range === undefined && req.query.filter && req.query.filter !== "all") return;

  const params = [];
  const paymentDate = condition("p.payment_date", range);
  addRangeParams(params, range);

  runQuery(res, `
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
  `, params);
};

exports.getTopDebtors = (req, res) => {
  const range = resolveRequestRange(req, res);
  if (range === undefined && req.query.filter && req.query.filter !== "all") return;

  const params = [];
  const caseDate = condition("lc.created_at", range);
  const serviceDate = condition("ls.created_at", range);
  const paymentDate = condition("p.payment_date", range);

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

  addRangeParams(params, range); // case fees
  addRangeParams(params, range); // service fees
  addRangeParams(params, range); // payments

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "فشل تحميل أعلى المدينين", error: err.message });
    }

    res.json((rows || [])
      .filter((row) => Number(row.remaining || 0) > 0)
      .map((row) => ({ ...row, remaining: Number(row.remaining || 0) })));
  });
};
