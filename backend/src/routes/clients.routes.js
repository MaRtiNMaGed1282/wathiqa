const express = require("express");
const router = express.Router();
const upload = require("../config/attorneyUpload");
const auth = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/authorize.middleware");
const redactFinancial = require("../middlewares/redactFinancial.middleware");
const { listClients } = require("../controllers/client-list.controller");

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

const allRoles = authorize("admin", "lawyer", "assistant");

router.get("/search", auth, allRoles, searchClients);
router.get("/list", auth, allRoles, listClients);
router.get("/", auth, allRoles, getAllClients);

router.get("/:id/financial-summary", auth, authorize("admin", "lawyer"), getClientFinancialSummary);
router.get("/:id/cases-financial", auth, authorize("admin", "lawyer"), getClientCasesFinancial);
router.get("/revenues/summary", auth, authorize("admin", "lawyer"), getRevenueSummary);
router.get("/revenues/clients", auth, authorize("admin", "lawyer"), getRevenueClients);
router.get("/dashboard/stats", auth, allRoles, redactFinancial, getDashboardStats);
router.get("/dashboard/monthly-revenue", auth, authorize("admin", "lawyer"), getMonthlyRevenue);
router.get("/dashboard/notifications", auth, allRoles, redactFinancial, getDashboardNotifications);
router.get("/dashboard/top-debtors", auth, authorize("admin", "lawyer"), getTopDebtors);
router.get("/dashboard/recent-payments", auth, authorize("admin", "lawyer"), getRecentPayments);
router.get("/reports/top-revenue-items", auth, authorize("admin", "lawyer"), getTopRevenueItems);

router.get("/:id", auth, allRoles, getClientById);
router.post("/", auth, allRoles, upload.single("attorney_file"), createClient);
router.put("/:id", auth, allRoles, updateClient);
router.delete("/:id", auth, authorize("admin"), deleteClient);

module.exports = router;
