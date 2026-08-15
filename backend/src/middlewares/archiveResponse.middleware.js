'use strict';

const db = require('../config/sqlite');
const { isArchived } = require('../services/archive.service');

const ENTITY_BY_PREFIX = [
  { prefix: '/api/clients', type: 'client', idKey: 'id' },
  { prefix: '/api/cases', type: 'case', idKey: 'case_id' },
  { prefix: '/api/services', type: 'service', idKey: 'service_id' },
];

function getContext(url = '') {
  return ENTITY_BY_PREFIX.find(({ prefix }) => url === prefix || url.startsWith(`${prefix}/`));
}

function getPathId(url = '') {
  const match = url.split('?')[0].match(/\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row || {}));
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
  });
}

async function removeArchived(rows, type, idKey = 'id') {
  const result = [];
  for (const row of rows || []) {
    const id = row?.[idKey] ?? row?.id;
    if (id == null || !(await isArchived(type, Number(id)))) result.push(row);
  }
  return result;
}

async function removeArchivedDeadlines(rows) {
  const result = [];
  for (const row of rows || []) {
    const type = row?.type === 'hearing' ? 'case' : 'service';
    if (row?.record_id == null || !(await isArchived(type, Number(row.record_id)))) result.push(row);
  }
  return result;
}

async function sanitizeDashboard(payload) {
  if (!payload?.dashboard) return payload;

  const dashboard = payload.dashboard;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [clientStats, caseStats, caseFees, serviceFees, paid, expenses, caseDistribution] = await Promise.all([
    dbGet(`SELECT COUNT(*) AS total,
                  SUM(CASE WHEN date(created_at) >= date(?) THEN 1 ELSE 0 END) AS this_month
           FROM clients c
           WHERE NOT EXISTS (
             SELECT 1 FROM archived_records ar
             WHERE ar.entity_type = 'client' AND ar.record_id = c.id AND ar.restored_at IS NULL
           )`, [monthStart]),
    dbGet(`SELECT
             SUM(CASE WHEN case_status NOT IN ('مغلقة', 'مغلق', 'closed', 'Closed') OR case_status IS NULL THEN 1 ELSE 0 END) AS active,
             SUM(CASE WHEN date(created_at) >= date(?) THEN 1 ELSE 0 END) AS new_this_month
           FROM legal_cases lc
           WHERE NOT EXISTS (
             SELECT 1 FROM archived_records ar
             WHERE ar.entity_type = 'case' AND ar.record_id = lc.case_id AND ar.restored_at IS NULL
           )`, [monthStart]),
    dbGet(`SELECT COALESCE(SUM(total_fees), 0) AS value FROM legal_cases lc
           WHERE NOT EXISTS (SELECT 1 FROM archived_records ar WHERE ar.entity_type='case' AND ar.record_id=lc.case_id AND ar.restored_at IS NULL)`),
    dbGet(`SELECT COALESCE(SUM(total_fees), 0) AS value FROM legal_services ls
           WHERE NOT EXISTS (SELECT 1 FROM archived_records ar WHERE ar.entity_type='service' AND ar.record_id=ls.service_id AND ar.restored_at IS NULL)`),
    dbGet(`SELECT COALESCE(SUM(p.amount), 0) AS value
           FROM payments p
           WHERE (p.case_id IS NULL OR NOT EXISTS (SELECT 1 FROM archived_records ar WHERE ar.entity_type='case' AND ar.record_id=p.case_id AND ar.restored_at IS NULL))
             AND (p.service_id IS NULL OR NOT EXISTS (SELECT 1 FROM archived_records ar WHERE ar.entity_type='service' AND ar.record_id=p.service_id AND ar.restored_at IS NULL))`),
    dbGet(`SELECT COALESCE(SUM(ce.amount), 0) AS value
           FROM case_expenses ce
           JOIN legal_cases lc ON lc.case_id = ce.case_id
           WHERE NOT EXISTS (SELECT 1 FROM archived_records ar WHERE ar.entity_type='case' AND ar.record_id=lc.case_id AND ar.restored_at IS NULL)`),
    dbAll(`SELECT lc.case_type, COUNT(*) AS count
           FROM legal_cases lc
           WHERE NOT EXISTS (SELECT 1 FROM archived_records ar WHERE ar.entity_type='case' AND ar.record_id=lc.case_id AND ar.restored_at IS NULL)
           GROUP BY lc.case_type ORDER BY count DESC LIMIT 8`),
  ]);

  dashboard.statistics = dashboard.statistics || {};
  dashboard.statistics.totalClients = Number(clientStats.total || 0);
  dashboard.statistics.clientsThisMonth = Number(clientStats.this_month || 0);
  dashboard.statistics.activeCases = Number(caseStats.active || 0);
  dashboard.statistics.newCasesThisMonth = Number(caseStats.new_this_month || 0);
  dashboard.caseDistribution = caseDistribution;
  dashboard.recentClients = await removeArchived(dashboard.recentClients, 'client', 'id');
  dashboard.recentCases = await removeArchived(dashboard.recentCases, 'case', 'case_id');
  dashboard.upcomingDeadlines = await removeArchivedDeadlines(dashboard.upcomingDeadlines);
  dashboard.deadlines = await removeArchivedDeadlines(dashboard.deadlines);

  if (dashboard.financial) {
    const totalFees = Number(caseFees.value || 0) + Number(serviceFees.value || 0);
    const totalPaid = Number(paid.value || 0);
    const totalExpenses = Number(expenses.value || 0);
    dashboard.financial.totalRevenue = totalPaid;
    dashboard.financial.outstandingAmount = totalFees - totalPaid;
    dashboard.financial.netProfit = totalPaid - totalExpenses;
  }

  return payload;
}

module.exports = function archiveResponseMiddleware(req, res, next) {
  const context = getContext(req.path);
  const isDashboard = req.path === '/api/dashboard';
  if ((!context && !isDashboard) || req.method !== 'GET') return next();

  const originalJson = res.json.bind(res);

  res.json = async function archiveAwareJson(payload) {
    try {
      if (isDashboard) return originalJson(await sanitizeDashboard(payload));

      if (Array.isArray(payload)) {
        return originalJson(await removeArchived(payload, context.type, context.idKey));
      }

      const id = getPathId(req.path);
      if (id && payload && typeof payload === 'object' && await isArchived(context.type, id)) {
        res.status(404);
        return originalJson({ message: 'السجل غير موجود' });
      }

      return originalJson(payload);
    } catch (error) {
      console.error('Archive response filtering failed:', error.message || error);
      return originalJson(payload);
    }
  };

  next();
};
