require("./config/env");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { CORS_ORIGINS } = require("./config/env");

require("./config/sqlite");

const app = express();

const authRoutes = require("./routes/auth.routes");
const attorneyRoutes = require("./routes/attorneys.routes");
const serviceRoutes = require("./routes/services.routes");
const expensesRoutes = require("./routes/expenses.routes");
const caseExpensesRoutes = require("./routes/case-expenses.routes");
const activityAuditMiddleware = require("./middlewares/activityAudit.middleware");

const corsOptions = {
  origin(origin, callback) {
    if (!origin || origin === "null") return callback(null, true);
    if (CORS_ORIGINS.length === 0 || CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS origin not allowed"));
  },
};

/* Middlewares */
app.use(cors(corsOptions));
app.use(express.json({ limit: "2mb" }));

// Register before route handlers so the finish listener can observe req.user after
authentication/authorization middleware has executed inside each route.
app.use(activityAuditMiddleware);

app.use("/api/auth", authRoutes);
app.use("/api/users", require("./routes/users.routes"));
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
app.use("/api/files", require("./routes/files.routes"));
app.use("/api/payments", require("./routes/payments.routes"));
app.use("/api/activity", require("./routes/activity.routes"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));
app.use("/api/notifications", require("./routes/notifications.routes"));
app.use("/api/search", require("./routes/search.routes"));
app.use("/api/attorneys", attorneyRoutes);

// Stored case/service/attorney files are intentionally NOT exposed through
// express.static. They must be served through authenticated API endpoints.

// Legal-library PDFs are served only through authenticated /api/library/laws/:id/file.
// Do not expose database/laws as a public static directory.

/* Test Route */
app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "Lawyer Case Management API is running",
  });
});

/*
 * Central upload/parser error handling.
 * Never expose Express/Multer stack traces to clients.
 */
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: "حجم الملف يتجاوز الحد المسموح (5 ميجابايت)",
      });
    }

    return res.status(400).json({
      message: "بيانات رفع الملف غير صالحة",
    });
  }

  if (err?.message === "Unsupported file type") {
    return res.status(400).json({
      message: "نوع الملف غير مدعوم",
    });
  }

  if (err?.message === "CORS origin not allowed") {
    return res.status(403).json({
      message: "مصدر الطلب غير مسموح",
    });
  }

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      message: "صيغة الطلب غير صالحة",
    });
  }

  console.error("Unhandled API error:", err?.message || err);

  return res.status(err?.status || 500).json({
    message:
      err?.status && err.status < 500
        ? err.message || "حدث خطأ في الطلب"
        : "حدث خطأ داخلي في الخادم",
  });
});

module.exports = app;
