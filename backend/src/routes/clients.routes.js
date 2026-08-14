const express = require("express");
const router = express.Router();
const upload = require("../config/attorneyUpload");
const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");

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

router.get("/:id/financial-summary", auth, authorize("admin", "lawyer"), getClientFinancialSummary);
router.get("/:id/cases-financial", auth, authorize("admin", "lawyer"), getClientCasesFinancial);
router.get("/revenues/summary", auth, authorize("admin", "lawyer"), getRevenueSummary);
router.get("/revenues/clients", auth, authorize("admin", "lawyer"), getRevenueClients);
router.get("/dashboard/stats", auth, getDashboardStats);
router.get("/dashboard/monthly-revenue", auth, authorize("admin", "lawyer"), getMonthlyRevenue);
router.get("/dashboard/notifications", auth, getDashboardNotifications);
router.get("/dashboard/top-debtors", auth, authorize("admin", "lawyer"), getTopDebtors);
router.get("/dashboard/recent-payments", auth, authorize("admin", "lawyer"), getRecentPayments);
router.get("/reports/top-revenue-items", auth, authorize("admin", "lawyer"), getTopRevenueItems);

router.get("/:id", auth, getClientById);
router.post("/", auth, upload.single("attorney_file"), createClient);
router.put("/:id", auth, updateClient);
router.delete("/:id", auth, authorize("admin"), deleteClient);

module.exports = router;
