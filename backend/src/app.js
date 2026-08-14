console.log(process.cwd());
const path = require("path");
require("./config/env");
const express = require("express");
const cors = require("cors");

require("./config/sqlite");

const app = express();

const authRoutes = require("./routes/auth.routes");
const attorneyRoutes = require("./routes/attorneys.routes");
const serviceRoutes = require("./routes/services.routes");
const expensesRoutes = require("./routes/expenses.routes");
const caseExpensesRoutes = require("./routes/case-expenses.routes");

/* Middlewares */
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", require("./routes/users.routes"));
app.use("/api/office", require("./routes/office.routes"));
app.use("/api/license", require("./routes/license.routes"));
app.use("/api/library", require("./routes/library.routes"));
app.use("/api/templates", require("./routes/templates.routes"));
app.use("/api/revenues", require("./routes/revenues.routes"));
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

console.log("STATIC UPLOADS =", path.join(process.cwd(), "../uploads"));
app.use("/uploads", express.static(path.join(process.cwd(), "../uploads")));
app.use("/uploads", express.static(path.join(__dirname, "../../uploads")));
app.use("/api/attorneys", attorneyRoutes);

// Legal-library PDFs are served only through authenticated /api/library/laws/:id/file.
// Do not expose database/laws as a public static directory.

app.use(
  "/template-files",
  express.static(path.join(__dirname, "../../database/templates")),
);

app.use(
  "/attorney-files",
  express.static(path.join(__dirname, "../../database/attorneys")),
);

/* Test Route */
app.get("/", (req, res) => {
  res.json({ status: "success", message: "Lawyer Case Management API is running" });
});

module.exports = app;
