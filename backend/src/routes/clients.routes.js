const express = require("express");
const router = express.Router();
const upload = require("../config/attorneyUpload");
const auth = require("../middlewares/auth.middleware");
const financial = require("../middlewares/financial.middleware");
const { idParam, validateClient } = require("../middlewares/validation.middleware");

const {
  createClient,
  getAllClients,
  getClientById,
  updateClient,
  deleteClient,
  searchClients,
  getClientFinancialSummary,
  getClientCasesFinancial,
  getRevenueSummary,
  getRevenueClients,
  getDashboardStats,
  getMonthlyRevenue,
  getDashboardNotifications,
  getTopDebtors,
  getRecentPayments,
  getTopRevenueItems,
} = require("../controllers/clients.controller");

router.get("/search", auth, searchClients);
router.get("/", auth, getAllClients);

router.get("/:id/financial-summary", auth, idParam(), financial, getClientFinancialSummary);
router.get("/:id/cases-financial", auth, idParam(), financial, getClientCasesFinancial);

router.get("/revenues/summary", auth, financial, getRevenueSummary);
router.get("/revenues/clients", auth, financial, getRevenueClients);
router.get("/dashboard/top-debtors", auth, financial, getTopDebtors);
router.get("/dashboard/recent-payments", auth, financial, getRecentPayments);
router.get("/reports/top-revenue-items", auth, financial, getTopRevenueItems);
router.get("/dashboard/stats", auth, getDashboardStats);
router.get("/dashboard/monthly-revenue", auth, financial, getMonthlyRevenue);
router.get("/dashboard/notifications", auth, getDashboardNotifications);

router.get("/:id", auth, idParam(), getClientById);
router.post("/", auth, validateClient, upload.single("attorney_file"), createClient);
router.put("/:id", auth, idParam(), validateClient, updateClient);
router.delete("/:id", auth, idParam(), deleteClient);

module.exports = router;
