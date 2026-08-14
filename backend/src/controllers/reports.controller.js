const db = require("../config/sqlite");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
    if (!DATE_RE.test(startDate || "") || !DATE_RE.test(endDate || "")) {
      const error = new Error("فترة التاريخ غير صالحة");
      error.status = 400;
      throw error;
    }
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
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

function dateClause(column, range, params) {
  if (!range) return "";
  params.push(range.startDate, range.endDate);
  return `AND date(${column}) BETWEEN ? AND ?`;
}

function all(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

function get(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => (err ? reject(err) : resolve(row || {})));
  });
}

function parseRequest(req) {
  return resolveDateRange(
    String(req.query.filter || "all"),
    req.query.startDate,
    req.query.endDate,
  );
}

exports.getOperationalReports = async (req, res) => {
  let range;
  try {
    range = parseRequest(req);
  } catch (error) {
    return res.status(error.status || 400).json({ message: error.message });
  }

  try {
    const params = [];
    const clientDate = dateClause("created_at", range, params);
    const caseDate = dateClause("created_at", range, params);
    const serviceDate = dateClause("created_at", range, params);
    const hearingDate = dateClause("hearing_date", range, params);
    const activityDate = dateClause("created_at", range, params);

    const counts = await get(`
      SELECT
        (SELECT COUNT(*) FROM clients WHERE 1=1 ${clientDate}) AS total_clients,
        (SELECT COUNT(*) FROM legal_cases WHERE 1=1 ${caseDate}) AS total_cases,
        (SELECT COUNT(*) FROM legal_services WHERE 1=1 ${serviceDate}) AS total_services,
        (SELECT COUNT(*) FROM hearings WHERE 1=1 ${hearingDate}) AS total_hearings,
        (SELECT COUNT(*) FROM activity_logs WHERE 1=1 ${activityDate}) AS total_activity
    `, params);

    const caseStatusParams = [];
    const caseStatusDate = dateClause("created_at", range, caseStatusParams);
    const serviceStatusParams = [];
    const serviceStatusDate = dateClause("created_at", range, serviceStatusParams);
    const hearingParams = [];
    const hearingDateClause = dateClause("h.hearing_date", range, hearingParams);
    const activityParams = [];
    const activityDateClause = dateClause("a.created_at", range, activityParams);

    const [caseStatuses, serviceStatuses, hearings, activities, cases, services] = await Promise.all([
      all(`
        SELECT COALESCE(case_status, 'غير محدد') AS status, COUNT(*) AS count
        FROM legal_cases
        WHERE 1=1 ${caseStatusDate}
        GROUP BY case_status
        ORDER BY count DESC
      `, caseStatusParams),
      all(`
        SELECT COALESCE(service_status, 'غير محدد') AS status, COUNT(*) AS count
        FROM legal_services
        WHERE 1=1 ${serviceStatusDate}
        GROUP BY service_status
        ORDER BY count DESC
      `, serviceStatusParams),
      all(`
        SELECT
          h.hearing_id,
          h.case_id,
          h.hearing_date,
          h.hearing_time,
          h.hearing_type,
          h.hearing_result,
          lc.case_title,
          lc.court_case_number,
          c.full_name
        FROM hearings h
        LEFT JOIN legal_cases lc ON lc.case_id = h.case_id
        LEFT JOIN clients c ON c.id = lc.client_id
        WHERE 1=1 ${hearingDateClause}
        ORDER BY date(h.hearing_date) ASC, h.hearing_time ASC
        LIMIT 5000
      `, hearingParams),
      all(`
        SELECT
          a.id,
          a.module,
          a.record_id,
          a.action,
          a.description,
          a.user_id,
          u.full_name AS user_name,
          a.created_at
        FROM activity_logs a
        LEFT JOIN users u ON u.id = a.user_id
        WHERE 1=1 ${activityDateClause}
        ORDER BY datetime(a.created_at) DESC, a.id DESC
        LIMIT 5000
      `, activityParams),
      all(`
        SELECT
          lc.case_id,
          lc.court_case_number,
          lc.case_title,
          lc.case_status,
          lc.priority_level,
          c.full_name AS client_name,
          lc.created_at
        FROM legal_cases lc
        LEFT JOIN clients c ON c.id = lc.client_id
        WHERE 1=1 ${caseDate}
        ORDER BY datetime(lc.created_at) DESC
        LIMIT 5000
      `, [ ...(range ? [range.startDate, range.endDate] : []) ]),
      all(`
        SELECT
          ls.service_id,
          ls.service_title,
          ls.service_type,
          ls.service_status,
          ls.priority_level,
          c.full_name AS client_name,
          ls.created_at
        FROM legal_services ls
        LEFT JOIN clients c ON c.id = ls.client_id
        WHERE 1=1 ${serviceDate}
        ORDER BY datetime(ls.created_at) DESC
        LIMIT 5000
      `, [ ...(range ? [range.startDate, range.endDate] : []) ]),
    ]);

    res.json({
      period: range || { startDate: null, endDate: null },
      counts: {
        total_clients: Number(counts.total_clients || 0),
        total_cases: Number(counts.total_cases || 0),
        total_services: Number(counts.total_services || 0),
        total_hearings: Number(counts.total_hearings || 0),
        total_activity: Number(counts.total_activity || 0),
      },
      case_statuses: caseStatuses.map((row) => ({ ...row, count: Number(row.count || 0) })),
      service_statuses: serviceStatuses.map((row) => ({ ...row, count: Number(row.count || 0) })),
      hearings,
      activity: activities,
      cases,
      services,
    });
  } catch (error) {
    return res.status(500).json({ message: "فشل تحميل التقارير التشغيلية", error: error.message });
  }
};

exports.getFinancialReports = async (req, res) => {
  let range;
  try {
    range = parseRequest(req);
  } catch (error) {
    return res.status(error.status || 400).json({ message: error.message });
  }

  try {
    const feesParams = [];
    const caseFeesDate = dateClause("created_at", range, feesParams);
    const serviceFeesDate = dateClause("created_at", range, feesParams);
    const paymentParams = [];
    const paymentDate = dateClause("payment_date", range, paymentParams);
    const caseExpenseParams = [];
    const caseExpenseDate = dateClause("expense_date", range, caseExpenseParams);
    const serviceExpenseParams = [];
    const serviceExpenseDate = dateClause("expense_date", range, serviceExpenseParams);

    const summary = await get(`
      SELECT
        (SELECT COALESCE(SUM(total_fees), 0) FROM legal_cases WHERE 1=1 ${caseFeesDate}) AS case_fees,
        (SELECT COALESCE(SUM(total_fees), 0) FROM legal_services WHERE 1=1 ${serviceFeesDate}) AS service_fees,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE 1=1 ${paymentDate}) AS total_paid,
        (SELECT COALESCE(SUM(amount), 0) FROM case_expenses WHERE 1=1 ${caseExpenseDate}) AS case_expenses,
        (SELECT COALESCE(SUM(amount), 0) FROM service_expenses WHERE 1=1 ${serviceExpenseDate}) AS service_expenses
    `, [...feesParams, ...paymentParams, ...caseExpenseParams, ...serviceExpenseParams]);

    const caseFees = Number(summary.case_fees || 0);
    const serviceFees = Number(summary.service_fees || 0);
    const totalFees = caseFees + serviceFees;
    const totalPaid = Number(summary.total_paid || 0);
    const totalExpenses = Number(summary.case_expenses || 0) + Number(summary.service_expenses || 0);

    const receivableParams = [];
    const rCaseDate = dateClause("lc.created_at", range, receivableParams);
    const rServiceDate = dateClause("ls.created_at", range, receivableParams);
    const rPaymentDate = dateClause("p.payment_date", range, receivableParams);

    const receivables = await all(`
      SELECT
        c.id,
        c.full_name,
        (
          SELECT COALESCE(SUM(lc.total_fees), 0) FROM legal_cases lc
          WHERE lc.client_id = c.id ${rCaseDate}
        ) + (
          SELECT COALESCE(SUM(ls.total_fees), 0) FROM legal_services ls
          WHERE ls.client_id = c.id ${rServiceDate}
        ) AS total_fees,
        (
          SELECT COALESCE(SUM(p.amount), 0)
          FROM payments p
          LEFT JOIN legal_cases pc ON pc.case_id = p.case_id
          LEFT JOIN legal_services ps ON ps.service_id = p.service_id
          WHERE (pc.client_id = c.id OR ps.client_id = c.id) ${rPaymentDate}
        ) AS total_paid
      FROM clients c
      ORDER BY total_fees DESC, c.full_name COLLATE NOCASE ASC
    `, receivableParams);

    const caseProfitParams = [];
    const cpCaseDate = dateClause("lc.created_at", range, caseProfitParams);
    const cpPaymentDate = dateClause("p.payment_date", range, caseProfitParams);
    const cpExpenseDate = dateClause("e.expense_date", range, caseProfitParams);
    const serviceProfitParams = [];
    const spServiceDate = dateClause("ls.created_at", range, serviceProfitParams);
    const spPaymentDate = dateClause("p.payment_date", range, serviceProfitParams);
    const spExpenseDate = dateClause("e.expense_date", range, serviceProfitParams);

    const [caseProfitability, serviceProfitability, payments, expenses] = await Promise.all([
      all(`
        SELECT
          lc.case_id AS id,
          lc.case_title AS title,
          c.full_name AS client_name,
          lc.total_fees,
          COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.case_id = lc.case_id ${cpPaymentDate}), 0) AS collected,
          COALESCE((SELECT SUM(e.amount) FROM case_expenses e WHERE e.case_id = lc.case_id ${cpExpenseDate}), 0) AS expenses
        FROM legal_cases lc
        LEFT JOIN clients c ON c.id = lc.client_id
        WHERE 1=1 ${cpCaseDate}
        ORDER BY lc.total_fees DESC, lc.case_id DESC
        LIMIT 5000
      `, caseProfitParams),
      all(`
        SELECT
          ls.service_id AS id,
          ls.service_title AS title,
          c.full_name AS client_name,
          ls.total_fees,
          COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.service_id = ls.service_id ${spPaymentDate}), 0) AS collected,
          COALESCE((SELECT SUM(e.amount) FROM service_expenses e WHERE e.service_id = ls.service_id ${spExpenseDate}), 0) AS expenses
        FROM legal_services ls
        LEFT JOIN clients c ON c.id = ls.client_id
        WHERE 1=1 ${spServiceDate}
        ORDER BY ls.total_fees DESC, ls.service_id DESC
        LIMIT 5000
      `, serviceProfitParams),
      all(`
        SELECT
          p.payment_id,
          p.amount,
          p.payment_date,
          p.payment_method,
          c.full_name AS client_name,
          lc.case_title,
          ls.service_title
        FROM payments p
        LEFT JOIN legal_cases lc ON lc.case_id = p.case_id
        LEFT JOIN legal_services ls ON ls.service_id = p.service_id
        LEFT JOIN clients c ON c.id = COALESCE(lc.client_id, ls.client_id)
        WHERE 1=1 ${paymentDate}
        ORDER BY date(p.payment_date) DESC, p.payment_id DESC
        LIMIT 5000
      `, paymentParams),
      all(`
        SELECT
          e.expense_id,
          e.amount,
          e.expense_date,
          e.expense_type,
          'قضية' AS item_type,
          lc.case_title AS item_title
        FROM case_expenses e
        LEFT JOIN legal_cases lc ON lc.case_id = e.case_id
        WHERE 1=1 ${caseExpenseDate}
        UNION ALL
        SELECT
          e.expense_id,
          e.amount,
          e.expense_date,
          e.expense_type,
          'خدمة' AS item_type,
          ls.service_title AS item_title
        FROM service_expenses e
        LEFT JOIN legal_services ls ON ls.service_id = e.service_id
        WHERE 1=1 ${serviceExpenseDate}
        ORDER BY date(expense_date) DESC, expense_id DESC
        LIMIT 5000
      `, [...caseExpenseParams.slice(0, range ? 2 : 0), ...serviceExpenseParams.slice(0, range ? 2 : 0)]),
    ]);

    const normalizeProfitability = (rows) => rows.map((row) => {
      const fees = Number(row.total_fees || 0);
      const collected = Number(row.collected || 0);
      const expensesValue = Number(row.expenses || 0);
      return { ...row, total_fees: fees, collected, expenses: expensesValue, net_profit: collected - expensesValue, remaining: fees - collected };
    });

    res.json({
      period: range || { startDate: null, endDate: null },
      summary: {
        case_fees: caseFees,
        service_fees: serviceFees,
        total_fees: totalFees,
        total_paid: totalPaid,
        total_expenses: totalExpenses,
        remaining: totalFees - totalPaid,
        net_profit: totalPaid - totalExpenses,
        collection_rate: totalFees > 0 ? Number(((totalPaid / totalFees) * 100).toFixed(1)) : 0,
      },
      receivables: receivables.map((row) => {
        const fees = Number(row.total_fees || 0);
        const paid = Number(row.total_paid || 0);
        return { id: row.id, full_name: row.full_name, total_fees: fees, total_paid: paid, remaining: fees - paid, status: fees - paid > 0 ? "مدين" : "مسدد" };
      }),
      payments,
      expenses,
      case_profitability: normalizeProfitability(caseProfitability),
      service_profitability: normalizeProfitability(serviceProfitability),
    });
  } catch (error) {
    return res.status(500).json({ message: "فشل تحميل التقارير المالية", error: error.message });
  }
};
