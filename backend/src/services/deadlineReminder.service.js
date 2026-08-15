const db = require("../config/sqlite");
const { createNotification } = require("../utils/notificationService");

const REMINDER_DAYS = new Set([7, 3, 1, 0]);
let running = false;

function dateOnly(value) {
  return String(value || "").slice(0, 10);
}

function addDays(date, days) {
  const result = new Date(`${date}T00:00:00`);
  result.setDate(result.getDate() + days);
  return result.toISOString().slice(0, 10);
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row || null)));
  });
}

async function notifyOnce({ userId, module, recordId, dueDate, daysRemaining, title, message }) {
  const type = "deadline";
  const existing = await dbGet(
    `SELECT id FROM notifications
     WHERE user_id = ? AND module = ? AND record_id = ? AND type = ?
       AND message = ?
     LIMIT 1`,
    [userId, module, recordId, type, message],
  );
  if (existing) return false;

  await createNotification({
    title,
    message,
    type,
    module,
    record_id: recordId,
    user_id: userId,
  });
  return true;
}

async function runDeadlineReminderCheck() {
  if (running) return;
  running = true;
  try {
    const today = dateOnly(new Date().toISOString());
    const maxDate = addDays(today, 7);
    const [users, services, hearings] = await Promise.all([
      dbAll(`SELECT id FROM users WHERE is_active = 1`),
      dbAll(`
        SELECT service_id, service_title, due_date
        FROM legal_services
        WHERE due_date IS NOT NULL
          AND date(due_date) BETWEEN date(?) AND date(?)
          AND lower(COALESCE(service_status, '')) NOT IN ('completed', 'مكتملة', 'مكتمل')
      `, [today, maxDate]),
      dbAll(`
        SELECT hearing_id, hearing_date, hearing_time, hearing_type
        FROM hearings
        WHERE hearing_date IS NOT NULL
          AND date(hearing_date) BETWEEN date(?) AND date(?)
      `, [today, maxDate]),
    ]);

    for (const service of services) {
      const dueDate = dateOnly(service.due_date);
      const daysRemaining = Math.round((new Date(`${dueDate}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000);
      if (!REMINDER_DAYS.has(daysRemaining)) continue;
      const when = daysRemaining === 0 ? "اليوم" : `خلال ${daysRemaining} أيام`;
      const title = "تذكير بموعد خدمة";
      const message = `الخدمة "${service.service_title}" مستحقة ${when} بتاريخ ${dueDate}.`;
      for (const user of users) {
        await notifyOnce({ userId: user.id, module: "service", recordId: service.service_id, dueDate, daysRemaining, title, message });
      }
    }

    for (const hearing of hearings) {
      const dueDate = dateOnly(hearing.hearing_date);
      const daysRemaining = Math.round((new Date(`${dueDate}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000);
      if (!REMINDER_DAYS.has(daysRemaining)) continue;
      const when = daysRemaining === 0 ? "اليوم" : `خلال ${daysRemaining} أيام`;
      const time = hearing.hearing_time ? ` الساعة ${String(hearing.hearing_time).slice(0, 5)}` : "";
      const title = "تذكير بموعد جلسة";
      const message = `لديك جلسة ${when} بتاريخ ${dueDate}${time}.`;
      for (const user of users) {
        await notifyOnce({ userId: user.id, module: "hearing", recordId: hearing.hearing_id, dueDate, daysRemaining, title, message });
      }
    }
  } catch (error) {
    console.error("Deadline reminder check failed:", error.message);
  } finally {
    running = false;
  }
}

function startDeadlineReminderScheduler() {
  setTimeout(runDeadlineReminderCheck, 3000);
  setInterval(runDeadlineReminderCheck, 60 * 60 * 1000);
}

module.exports = {
  runDeadlineReminderCheck,
  startDeadlineReminderScheduler,
};
