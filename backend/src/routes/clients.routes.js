const express = require("express");
const router = express.Router();
const upload = require("../config/attorneyUpload");
const auth = require("../middlewares/auth.middleware");

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

/**
 * Search clients
 * Must come before /:id
 */
router.get("/search", auth, searchClients);

/**
 * Get all clients
 */
router.get("/", auth, getAllClients);

router.get("/:id/financial-summary", auth, getClientFinancialSummary);

router.get("/:id/cases-financial", auth, getClientCasesFinancial);

router.get("/revenues/summary", auth, getRevenueSummary);

router.get("/revenues/clients", auth, getRevenueClients);

router.get("/dashboard/stats", auth, getDashboardStats);

router.get("/dashboard/monthly-revenue", auth, getMonthlyRevenue);

router.get("/dashboard/notifications", auth, getDashboardNotifications);

router.get("/dashboard/top-debtors", auth, getTopDebtors);

router.get("/dashboard/recent-payments", auth, getRecentPayments);

router.get("/reports/top-revenue-items", auth, getTopRevenueItems);

/**
 * Get single client
 */
router.get("/:id", auth, getClientById);

/**
 * Create client
 */
router.post("/", auth, upload.single("attorney_file"), createClient);

/**
 * Update client
 */
router.put("/:id", auth, updateClient);

/**
 * Delete client
 */
router.delete("/:id", auth, deleteClient);

module.exports = router;
