const db = require("../config/sqlite");
const {
  assertFinancialRole,
  createClientPdf,
  createCasePdf,
  createServicePdf,
  createFinancialPdf,
  createReportsPdf,
} = require("../services/pdf.service");

function sendPdf(res, buffer, filename) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  res.setHeader("Content-Length", buffer.length);
  res.send(buffer);
}

function handleError(res, error) {
  console.error("PDF generation error:", error);
  return res.status(error.status || 500).json({
    message: error.message || "فشل إنشاء ملف PDF",
  });
}

exports.client = async (req, res) => {
  try {
    const buffer = await createClientPdf(db, req.params.id, req.user);
    sendPdf(res, buffer, `client-${req.params.id}.pdf`);
  } catch (error) { handleError(res, error); }
};

exports.case = async (req, res) => {
  try {
    const buffer = await createCasePdf(db, req.params.id, req.user);
    sendPdf(res, buffer, `case-${req.params.id}.pdf`);
  } catch (error) { handleError(res, error); }
};

exports.service = async (req, res) => {
  try {
    const buffer = await createServicePdf(db, req.params.id, req.user);
    sendPdf(res, buffer, `service-${req.params.id}.pdf`);
  } catch (error) { handleError(res, error); }
};

exports.financial = async (req, res) => {
  try {
    assertFinancialRole(req.user);
    const buffer = await createFinancialPdf(db, req.query);
    sendPdf(res, buffer, "financial-report.pdf");
  } catch (error) { handleError(res, error); }
};

exports.reports = async (req, res) => {
  try {
    const buffer = await createReportsPdf(db, req.query);
    sendPdf(res, buffer, "reports.pdf");
  } catch (error) { handleError(res, error); }
};
