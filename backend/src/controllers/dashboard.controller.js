const fs = require("fs");
const path = require("path");
const db = require("../config/sqlite");
const { listBackups, getBackupRoot } = require("../services/backup.service");

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || {});
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function dateAfterISO(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function safeNumber(value) {
  return Number(value || 0);
}

function formatActivityDescription(activity = {}) {
  const raw = typeof activity.description === "string" ? activity.description.trim() : "";
  if (!raw) return activity.action || "نشاط";

  try {
    const details = JSON.parse(raw);
    if (details?.source !== "request-audit") return raw;

    const moduleLabels = {
      client: "الموكل",
      case: "القضية",
      service: "الخدمة",
      hearing: "الجلسة",
      payment: "الدفعة",
      revenue: "الإيراد",
      expense: "المصروف",
      user: "المستخدم",
      office: "بيانات المكتب",
      backup: "النسخة الاحتياطية",
      file: "الملف",
      document: "المستند",
    };

    const action = String(details.action || activity.action || "").toLowerCase();
    const module = String(details.module || activity.module || "").toLowerCase();
    const label = moduleLabels[module] || "السجل";

    const actionLabels = {
      create: "إضافة",
      created: "إضافة",
      post: "إضافة",
      update: "تعديل",
      updated: "تعديل",
      put: "تعديل",
      delete: "حذف",
      deleted: "حذف",
      remove: "حذف",
      patch: "تعديل",
    };

    const verb = actionLabels[action];
    if (verb) return `تم ${verb} ${label}`;

    return `تم تنفيذ عملية على ${label}`;
  } catch {
    return raw;
  }
}

function normalizeRecentActivity(rows = []) {
  return rows.map((activity) => ({
    ...activity,
    description: formatActivityDescription(activity),
  }));
}

async function getLatestBackup(role) {
  if (role !== "admin") return null;

  try {
    const names = await listBackups();
    if (!names.length) return null;

    const name = names[0];
    const filePath = path.join(getBackupRoot(), name);
    const stat = await fs.promises.stat(filePath);
    return stat.mtime.toISOString();
  } catch {
    return null;
  }
}

exports.getDashboard = async (req, res, next) => {
  try {
    const today = todayISO();
    const monthStart = monthStartISO();
    const urgentThrough = dateAfterISO(3);
    const deadlineThrough = dateAfterISO(30);
    const role = req.user?.role || "assistant";
    const canViewFinancials = role === "admin" || role === "lawyer";

    const [
      office,
      clientStats,
      caseStats,
      hearingsToday,
      upcomingHearings,
      recentClients,
      recentCases,
      notifications,
      unreadNotifications,
      recentActivity,
      upcomingDeadlines,
      urgentTasks,
      caseDistribution,
      license,
      lastBackup,
    ] = await Promise.all([
      dbGet(`
        SELECT office_name, logo_path, stamp_path
        FROM office_settings
        LIMIT 1
      `),
      dbGet(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN date(created_at) >= date(?) THEN 1 ELSE 0 END) AS this_month
        FROM clients
      `, [monthStart]),
      dbGet(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN case_status NOT IN ('مغلقة', 'مغلق', 'closed', 'Closed') OR case_status IS NULL THEN 1 ELSE 0 END) AS active,
          SUM(CASE WHEN date(created_at) >= date(?) THEN 1 ELSE 0 END) AS new_this_month
        FROM legal_cases
      `, [monthStart]),
      dbAll(`
        SELECT
          h.hearing_id,
          h.case_id,
          h.hearing_date,
          h.hearing_time,
          h.hearing_type,
          h.hearing_result,
          lc.court_case_number,
          lc.case_type,
          lc.court_name,
          lc.case_title,
          c.full_name AS client_name
        FROM hearings h
        LEFT JOIN legal_cases lc ON h.case_id = lc.case_id
        LEFT JOIN clients c ON lc.client_id = c.id
        WHERE date(h.hearing_date) = date(?)
        ORDER BY h.hearing_time ASC, h.hearing_id ASC
        LIMIT 20
      `, [today]),
      dbAll(`
        SELECT
          h.hearing_id,
          h.case_id,
          h.hearing_date,
          h.hearing_time,
          h.hearing_type,
          lc.court_case_number,
          lc.case_title,
          c.full_name AS client_name
        FROM hearings h
        LEFT JOIN legal_cases lc ON h.case_id = lc.case_id
        LEFT JOIN clients c ON lc.client_id = c.id
        WHERE date(h.hearing_date) > date(?)
        ORDER BY date(h.hearing_date) ASC, h.hearing_time ASC
        LIMIT 10
      `, [today]),
      dbAll(`
        SELECT id, client_code, full_name, phone, created_at
        FROM clients
        ORDER BY created_at DESC
        LIMIT 5
      `),
      dbAll(`
        SELECT
          lc.case_id,
          lc.case_title,
          lc.court_case_number,
          lc.case_status,
          lc.case_type,
          lc.created_at,
          c.full_name AS client_name
        FROM legal_cases lc
        LEFT JOIN clients c ON lc.client_id = c.id
        ORDER BY lc.created_at DESC
        LIMIT 5
      `),
      dbAll(`
        SELECT id, title, message, type, module, record_id, is_read, created_at
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 6
      `, [req.user.id]),
      dbGet(`
        SELECT COUNT(*) AS total
        FROM notifications
        WHERE user_id = ? AND is_read = 0
      `, [req.user.id]),
      dbAll(`
        SELECT
          activity_logs.id,
          activity_logs.module,
          activity_logs.record_id,
          activity_logs.action,
          activity_logs.description,
          activity_logs.created_at,
          users.full_name AS user_name
        FROM activity_logs
        LEFT JOIN users ON activity_logs.user_id = users.id
        ORDER BY activity_logs.created_at DESC, activity_logs.id DESC
        LIMIT 8
      `),
      dbAll(`
        SELECT * FROM (
          SELECT
            'service' AS type,
            ls.service_id AS record_id,
            ls.service_title AS title,
            ls.due_date AS due_date,
            ls.priority_level AS priority,
            ls.service_status AS status,
            c.full_name AS client_name
          FROM legal_services ls
          LEFT JOIN clients c ON c.id = ls.client_id
          WHERE ls.due_date IS NOT NULL
            AND date(ls.due_date) BETWEEN date(?) AND date(?)
            AND lower(COALESCE(ls.service_status, '')) NOT IN ('completed', 'مكتملة', 'مكتمل')

          UNION ALL

          SELECT
            'hearing' AS type,
            h.hearing_id AS record_id,
            COALESCE(lc.case_title, 'جلسة') AS title,
            h.hearing_date AS due_date,
            lc.priority_level AS priority,
            CASE WHEN h.hearing_result IS NULL OR h.hearing_result = '' THEN 'scheduled' ELSE h.hearing_result END AS status,
            c.full_name AS client_name
          FROM hearings h
          LEFT JOIN legal_cases lc ON lc.case_id = h.case_id
          LEFT JOIN clients c ON c.id = lc.client_id
          WHERE h.hearing_date IS NOT NULL
            AND date(h.hearing_date) BETWEEN date(?) AND date(?)
        )
        ORDER BY date(due_date) ASC, record_id ASC
        LIMIT 10
      `, [today, deadlineThrough, today, deadlineThrough]),
      dbGet(`
        SELECT
          (
            SELECT COUNT(*)
            FROM legal_services
            WHERE due_date IS NOT NULL
              AND date(due_date) BETWEEN date(?) AND date(?)
              AND lower(COALESCE(service_status, '')) NOT IN ('completed', 'مكتملة', 'مكتمل')
          ) + (
            SELECT COUNT(*)
            FROM hearings
            WHERE hearing_date IS NOT NULL
              AND date(hearing_date) BETWEEN date(?) AND date(?)
          ) AS total
      `, [today, urgentThrough, today, urgentThrough]),
      dbAll(`
        SELECT case_type, COUNT(*) AS count
        FROM legal_cases
        GROUP BY case_type
        ORDER BY count DESC
        LIMIT 8
      `),
      dbGet(`
        SELECT office_name, expiry_date, is_active, created_at
        FROM license
        LIMIT 1
      `),
      getLatestBackup(role),
    ]);

    const response = {
      office: {
        officeName: office.office_name || "مكتب المحاماة",
        logo: office.logo_path || null,
        lastBackup,
      },
      dashboard: {
        summary: {
          hearingsToday: hearingsToday.length,
          appointmentsToday: 0,
          notifications: safeNumber(unreadNotifications.total),
          urgentTasks: safeNumber(urgentTasks.total),
        },
        statistics: {
          totalClients: safeNumber(clientStats.total),
          clientsThisMonth: safeNumber(clientStats.this_month),
          activeCases: safeNumber(caseStats.active),
          newCasesThisMonth: safeNumber(caseStats.new_this_month),
          hearingsToday: hearingsToday.length,
        },
        todayHearings: hearingsToday.map((hearing) => ({
          hearingId: hearing.hearing_id,
          caseId: hearing.case_id,
          time: hearing.hearing_time || "—",
          caseNumber: hearing.court_case_number || "—",
          clientName: hearing.client_name || "—",
          courtName: hearing.court_name || "—",
          caseType: hearing.case_type || "—",
          status: hearing.hearing_result ? "completed" : "scheduled",
          statusText: hearing.hearing_result || "مجدولة",
        })),
        upcomingHearings,
        recentClients,
        recentCases,
        notifications: notifications.map((item) => ({
          ...item,
          time: item.created_at,
        })),
        recentActivity: normalizeRecentActivity(recentActivity),
        deadlines: upcomingDeadlines,
        caseDistribution,
        system: {
          database: "connected",
          server: "online",
        },
        license: license
          ? {
              officeName: license.office_name || null,
              expiryDate: license.expiry_date || null,
              active: Boolean(license.is_active),
              createdAt: license.created_at || null,
            }
          : null,
      },
    };

    if (canViewFinancials) {
      const financial = await dbGet(`
        SELECT
          COALESCE((SELECT SUM(total_fees) FROM legal_cases), 0) AS case_fees,
          COALESCE((SELECT SUM(total_fees) FROM legal_services), 0) AS service_fees,
          COALESCE((SELECT SUM(amount) FROM payments), 0) AS total_paid,
          COALESCE((SELECT SUM(amount) FROM payments WHERE date(payment_date) >= date(?)), 0) AS month_paid,
          COALESCE((SELECT SUM(amount) FROM case_expenses), 0) AS total_expenses
      `, [monthStart]);

      const totalFees = safeNumber(financial.case_fees) + safeNumber(financial.service_fees);
      const totalPaid = safeNumber(financial.total_paid);
      const totalExpenses = safeNumber(financial.total_expenses);

      response.dashboard.financial = {
        totalRevenue: totalPaid,
        monthlyRevenue: safeNumber(financial.month_paid),
        outstandingAmount: totalFees - totalPaid,
        netProfit: totalPaid - totalExpenses,
      };
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
};
