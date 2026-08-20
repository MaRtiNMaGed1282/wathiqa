require("./config/env");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { CORS_ORIGINS } = require("./config/env");

require("./config/sqlite");
const { startDeadlineReminderScheduler } = require("./services/deadlineReminder.service");

const app = express();
const authRoutes = require("./routes/auth.routes");
const attorneyRoutes = require("./routes/attorneys.routes");
const serviceRoutes = require("./routes/services.routes");
const expensesRoutes = require("./routes/expenses.routes");
const caseExpensesRoutes = require("./routes/case-expenses.routes");
const activityAuditMiddleware = require("./middlewares/activityAudit.middleware");
const archiveResponseMiddleware = require("./middlewares/archiveResponse.middleware");
const licenseMiddleware = require("./middlewares/license.middleware");

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (origin === "null") return callback(new Error("CORS origin not allowed"));
    if (CORS_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error("CORS origin not allowed"));
  },
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Device-Token", "X-Requested-With"],
  optionsSuccessStatus: 204,
};

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

app.use(cors(corsOptions));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false, limit: "256kb" }));
app.use(activityAuditMiddleware);
app.use(archiveResponseMiddleware);
app.use(licenseMiddleware);

app.use("/api/system", require("./routes/system.routes"));
app.use("/api/auth", authRoutes);
app.use("/api/sessions", require("./routes/sessions.routes"));
app.use("/api/users", require("./routes/users.routes"));
app.use("/api/permissions", require("./routes/permissions.routes"));
app.use("/api/office", require("./routes/office.routes"));
app.use("/api/license", require("./routes/license.routes"));
app.use("/api/library", require("./routes/library.routes"));
app.use("/api/revenues", require("./routes/revenues.routes"));
app.use("/api/reports", require("./routes/reports.routes"));
app.use("/api/pdfs", require("./routes/pdf.routes"));
app.use("/api/clients", require("./routes/clients.routes"));
app.use("/api/cases", require("./routes/cases.routes"));
app.use("/api/case-expenses", caseExpensesRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/expenses", expensesRoutes);
app.use("/api/hearings", require("./routes/hearings.routes"));
app.use("/api/calendar", require("./routes/calendar.routes"));
app.use("/api/files", require("./routes/files.routes"));
app.use("/api/payments", require("./routes/payments.routes"));
app.use("/api/invoices", require("./routes/invoices.routes"));
app.use("/api/activity", require("./routes/activity.routes"));
app.use("/api/audit", require("./routes/audit.routes"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));
app.use("/api/deadlines", require("./routes/deadlines.routes"));
app.use("/api/notifications", require("./routes/notifications.routes"));
app.use("/api/search", require("./routes/search.routes"));
app.use("/api/attorneys", attorneyRoutes);
app.use("/api/backup", require("./routes/backup.routes"));
app.use("/api/archive", require("./routes/archive.routes"));

app.get("/", (req, res) => res.json({ status: "success", message: "واجهة برمجة تطبيقات نظام وثيقة تعمل بنجاح" }));
startDeadlineReminderScheduler();

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ message: "حجم الملف يتجاوز الحد المسموح (5 ميجابايت)" });
    return res.status(400).json({ message: "بيانات رفع الملف غير صالحة" });
  }
  if (err?.message === "Unsupported file type") return res.status(400).json({ message: "نوع الملف غير مدعوم" });
  if (err?.message === "CORS origin not allowed") return res.status(403).json({ message: "مصدر الطلب غير مسموح" });
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) return res.status(400).json({ message: "صيغة الطلب غير صالحة" });
  console.error("خطأ غير معالج في واجهة برمجة التطبيقات:", err?.message || "حدث خطأ غير معروف");
  return res.status(err?.status || 500).json({ message: err?.status && err.status < 500 ? err.message || "حدث خطأ في الطلب" : "حدث خطأ داخلي في الخادم" });
});

module.exports = app;
