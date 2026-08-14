const db = require("../config/sqlite");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function resolveDateRange(filter = "all", startDate, endDate) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === "all") return null;
  if (filter === "today") { const d = formatDate(today); return { startDate: d, endDate: d }; }
  if (filter === "week") {
    const start = new Date(today);
    const offset = today.getDay() === 0 ? 6 : today.getDay() - 1;
    start.setDate(start.getDate() - offset);
    const end = new Date(start); end.setDate(end.getDate() + 6);
    return { startDate: formatDate(start), endDate: formatDate(end) };
  }
  if (filter === "month") return { startDate: formatDate(new Date(today.getFullYear(), today.getMonth(), 1)), endDate: formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)) };
  if (filter === "year") return { startDate: formatDate(new Date(today.getFullYear(), 0, 1)), endDate: formatDate(new Date(today.getFullYear(), 11, 31)) };
  if (filter === "custom") {
    if (!DATE_RE.test(startDate || "") || !DATE_RE.test(endDate || "") || startDate > endDate) {
      const error = new Error("فترة التاريخ غير صالحة"); error.status = 400; throw error;
    }
    return { startDate, endDate };
  }
  const error = new Error("نوع الفترة غير صالح"); error.status = 400; throw error;
}

function clause(column, range) {
  return range ? `AND date(${column}) BETWEEN '${range.startDate}' AND '${range.endDate}'` : "";
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || [])));
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row || {})));
}

function requestRange(req) {
  return resolveDateRange(String(req.query.filter || "all"), req.query.startDate, req.query.endDate);
}

exports.getOperationalReports = async (req, res) => {
  let range;
  try { range = requestRange(req); } catch (error) { return res.status(error.status || 400).json({ message: error.message }); }
  try {
    const [counts, caseStatuses, serviceStatuses, hearings, activity, cases, services] = await Promise.all([
      get(`SELECT
        (SELECT COUNT(*) FROM clients WHERE 1=1 ${clause("created_at", range)}) total_clients,
        (SELECT COUNT(*) FROM legal_cases WHERE 1=1 ${clause("created_at", range)}) total_cases,
        (SELECT COUNT(*) FROM legal_services WHERE 1=1 ${clause("created_at", range)}) total_services,
        (SELECT COUNT(*) FROM hearings WHERE 1=1 ${clause("hearing_date", range)}) total_hearings,
        (SELECT COUNT(*) FROM activity_logs WHERE 1=1 ${clause("created_at", range)}) total_activity`),
      all(`SELECT COALESCE(case_status,'غير محدد') status, COUNT(*) count FROM legal_cases WHERE 1=1 ${clause("created_at", range)} GROUP BY case_status ORDER BY count DESC`),
      all(`SELECT COALESCE(service_status,'غير محدد') status, COUNT(*) count FROM legal_services WHERE 1=1 ${clause("created_at", range)} GROUP BY service_status ORDER BY count DESC`),
      all(`SELECT h.hearing_id,h.case_id,h.hearing_date,h.hearing_time,h.hearing_type,h.hearing_result,lc.case_title,lc.court_case_number,c.full_name
        FROM hearings h LEFT JOIN legal_cases lc ON lc.case_id=h.case_id LEFT JOIN clients c ON c.id=lc.client_id
        WHERE 1=1 ${clause("h.hearing_date", range)} ORDER BY date(h.hearing_date),h.hearing_time LIMIT 5000`),
      all(`SELECT a.id,a.module,a.record_id,a.action,a.description,a.user_id,u.full_name user_name,a.created_at
        FROM activity_logs a LEFT JOIN users u ON u.id=a.user_id
        WHERE 1=1 ${clause("a.created_at", range)} ORDER BY datetime(a.created_at) DESC,a.id DESC LIMIT 5000`),
      all(`SELECT lc.case_id,lc.court_case_number,lc.case_title,lc.case_status,lc.priority_level,c.full_name client_name,lc.created_at
        FROM legal_cases lc LEFT JOIN clients c ON c.id=lc.client_id
        WHERE 1=1 ${clause("lc.created_at", range)} ORDER BY datetime(lc.created_at) DESC LIMIT 5000`),
      all(`SELECT ls.service_id,ls.service_title,ls.service_type,ls.service_status,ls.priority_level,c.full_name client_name,ls.created_at
        FROM legal_services ls LEFT JOIN clients c ON c.id=ls.client_id
        WHERE 1=1 ${clause("ls.created_at", range)} ORDER BY datetime(ls.created_at) DESC LIMIT 5000`),
    ]);
    res.json({
      period: range || { startDate: null, endDate: null },
      counts: Object.fromEntries(Object.entries(counts).map(([k,v]) => [k, Number(v || 0)])),
      case_statuses: caseStatuses.map(r => ({ ...r, count: Number(r.count || 0) })),
      service_statuses: serviceStatuses.map(r => ({ ...r, count: Number(r.count || 0) })),
      hearings, activity, cases, services,
    });
  } catch (error) {
    res.status(500).json({ message: "فشل تحميل التقارير التشغيلية", error: error.message });
  }
};

exports.getFinancialReports = async (req, res) => {
  let range;
  try { range = requestRange(req); } catch (error) { return res.status(error.status || 400).json({ message: error.message }); }
  try {
    const summary = await get(`SELECT
      (SELECT COALESCE(SUM(total_fees),0) FROM legal_cases WHERE 1=1 ${clause("created_at", range)}) case_fees,
      (SELECT COALESCE(SUM(total_fees),0) FROM legal_services WHERE 1=1 ${clause("created_at", range)}) service_fees,
      (SELECT COALESCE(SUM(amount),0) FROM payments WHERE 1=1 ${clause("payment_date", range)}) total_paid,
      (SELECT COALESCE(SUM(amount),0) FROM case_expenses WHERE 1=1 ${clause("expense_date", range)}) case_expenses,
      (SELECT COALESCE(SUM(amount),0) FROM service_expenses WHERE 1=1 ${clause("expense_date", range)}) service_expenses`);

    const caseFees = Number(summary.case_fees || 0);
    const serviceFees = Number(summary.service_fees || 0);
    const totalFees = caseFees + serviceFees;
    const totalPaid = Number(summary.total_paid || 0);
    const totalExpenses = Number(summary.case_expenses || 0) + Number(summary.service_expenses || 0);

    const [receivables, payments, expenses, caseProfitability, serviceProfitability] = await Promise.all([
      all(`SELECT c.id,c.full_name,
        (SELECT COALESCE(SUM(lc.total_fees),0) FROM legal_cases lc WHERE lc.client_id=c.id ${clause("lc.created_at", range)}) +
        (SELECT COALESCE(SUM(ls.total_fees),0) FROM legal_services ls WHERE ls.client_id=c.id ${clause("ls.created_at", range)}) total_fees,
        (SELECT COALESCE(SUM(p.amount),0) FROM payments p LEFT JOIN legal_cases pc ON pc.case_id=p.case_id LEFT JOIN legal_services ps ON ps.service_id=p.service_id
          WHERE (pc.client_id=c.id OR ps.client_id=c.id) ${clause("p.payment_date", range)}) total_paid
        FROM clients c ORDER BY total_fees DESC,c.full_name COLLATE NOCASE ASC`),
      all(`SELECT p.payment_id,p.amount,p.payment_date,p.payment_method,c.full_name client_name,lc.case_title,ls.service_title
        FROM payments p LEFT JOIN legal_cases lc ON lc.case_id=p.case_id LEFT JOIN legal_services ls ON ls.service_id=p.service_id
        LEFT JOIN clients c ON c.id=COALESCE(lc.client_id,ls.client_id)
        WHERE 1=1 ${clause("p.payment_date", range)} ORDER BY date(p.payment_date) DESC,p.payment_id DESC LIMIT 5000`),
      all(`SELECT e.expense_id,e.amount,e.expense_date,e.expense_type,'قضية' item_type,lc.case_title item_title FROM case_expenses e LEFT JOIN legal_cases lc ON lc.case_id=e.case_id WHERE 1=1 ${clause("e.expense_date", range)}
        UNION ALL
        SELECT e.expense_id,e.amount,e.expense_date,e.expense_type,'خدمة' item_type,ls.service_title item_title FROM service_expenses e LEFT JOIN legal_services ls ON ls.service_id=e.service_id WHERE 1=1 ${clause("e.expense_date", range)}
        ORDER BY date(expense_date) DESC,expense_id DESC LIMIT 5000`),
      all(`SELECT lc.case_id id,lc.case_title title,c.full_name client_name,lc.total_fees,
        COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.case_id=lc.case_id ${clause("p.payment_date", range)}),0) collected,
        COALESCE((SELECT SUM(e.amount) FROM case_expenses e WHERE e.case_id=lc.case_id ${clause("e.expense_date", range)}),0) expenses
        FROM legal_cases lc LEFT JOIN clients c ON c.id=lc.client_id WHERE 1=1 ${clause("lc.created_at", range)} ORDER BY lc.total_fees DESC,lc.case_id DESC LIMIT 5000`),
      all(`SELECT ls.service_id id,ls.service_title title,c.full_name client_name,ls.total_fees,
        COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.service_id=ls.service_id ${clause("p.payment_date", range)}),0) collected,
        COALESCE((SELECT SUM(e.amount) FROM service_expenses e WHERE e.service_id=ls.service_id ${clause("e.expense_date", range)}),0) expenses
        FROM legal_services ls LEFT JOIN clients c ON c.id=ls.client_id WHERE 1=1 ${clause("ls.created_at", range)} ORDER BY ls.total_fees DESC,ls.service_id DESC LIMIT 5000`),
    ]);

    const normalize = rows => rows.map(r => {
      const fees = Number(r.total_fees || 0), collected = Number(r.collected || 0), expense = Number(r.expenses || 0);
      return { ...r, total_fees: fees, collected, expenses: expense, remaining: fees - collected, net_profit: collected - expense };
    });
    const normalizedReceivables = receivables.map(r => {
      const fees = Number(r.total_fees || 0), paid = Number(r.total_paid || 0);
      return { id:r.id, full_name:r.full_name, total_fees:fees, total_paid:paid, remaining:fees-paid, status:fees-paid > 0 ? "مدين" : "مسدد" };
    });

    res.json({
      period: range || { startDate:null, endDate:null },
      summary: {
        case_fees:caseFees, service_fees:serviceFees, total_fees:totalFees, total_paid:totalPaid,
        total_expenses:totalExpenses, remaining:totalFees-totalPaid, net_profit:totalPaid-totalExpenses,
        collection_rate:totalFees > 0 ? Number(((totalPaid/totalFees)*100).toFixed(1)) : 0,
      },
      receivables: normalizedReceivables,
      payments,
      expenses,
      case_profitability: normalize(caseProfitability),
      service_profitability: normalize(serviceProfitability),
    });
  } catch (error) {
    res.status(500).json({ message: "فشل تحميل التقارير المالية", error: error.message });
  }
};
