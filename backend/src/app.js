const path = require("path");
const express = require("express");
const cors = require("cors");

require("./config/sqlite");

const app = express();

const authRoutes = require("./routes/auth.routes");

/* Middlewares */
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

app.use("/api/license", require("./routes/license.routes"));

app.use("/api/clients", require("./routes/clients.routes"));

app.use("/api/cases", require("./routes/cases.routes"));

app.use("/api/hearings", require("./routes/hearings.routes"));

app.use("/api/files", require("./routes/files.routes"));

app.use("/api/payments", require("./routes/payments.routes"));

app.use("/uploads", express.static("uploads"));

console.log(path.join(__dirname, "../../frontend"));

app.use(express.static(path.join(__dirname, "../../frontend")));

/* Test Route */
app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "Lawyer Case Management API is running",
  });
});

module.exports = app;
